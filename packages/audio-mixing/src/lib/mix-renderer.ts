import type { Recording } from '@org/audio-library-models';

import { balanceToGains } from './balance-gains.ts';
import { MIX_ENGINE_VERSION } from './engine-version.ts';
import { createMixLimiter } from './mix-limiter.ts';
import { planMixRender, type MixPlanSegment } from './mix-render-plan.ts';
import { readResampledWindow } from './pcm-resampled-window.ts';
import { floatToInt16 } from './wav.ts';
import type { PcmWindowReader } from './wav-window-reader.ts';

/**
 * Renders a recording's mix offline, a chunk at a time (rehearsal-recording
 * design Decision 12). The render is a pure function of the recording's
 * metadata, its audio, the original track audio behind the stretcher, and the
 * balance and level passed in: it reads no session, cache or clock, so the
 * same inputs on the same engine version give the same samples.
 */

const DEFAULT_CHUNK_FRAMES = 32_768;
const UNIT_GAIN = 1;

/** The original track's audio, played at one rate and pitch from one position. */
export type TrackStream = {
  /** Exactly `frames` frames per channel, padded with silence past the end. */
  read: (frames: number) => Promise<Float32Array[]>;
  close: () => void;
};

/**
 * Produces the original track shaped the way the recording was made. The app
 * backs it with the SoundTouch processor; specs back it with a synthetic one.
 */
export type TrackStretcher = {
  channels: number;
  sampleRate: number;
  open: (request: {
    trackStartMs: number;
    rate: number;
    pitchSemitones: number;
  }) => Promise<TrackStream>;
};

type RenderedRecording = Pick<
  Recording,
  'durationMs' | 'nudgeMs' | 'shaping' | 'timeline'
>;

export type RenderMixOptions = {
  recording: RenderedRecording;
  reader: PcmWindowReader;
  stretcher: TrackStretcher;
  /** 0 is all track, 100 all recording. */
  balance: number;
  /** Linear gain on the recording, from its level; defaults to unity. */
  levelGain?: number;
  chunkFrames?: number;
  signal?: AbortSignal;
  onProgress?: (framesDone: number, totalFrames: number) => void;
  /** Receives interleaved 16-bit samples in order; awaited before the next chunk. */
  write: (samples: Int16Array) => Promise<void> | void;
};

export type RenderMixResult =
  | {
      status: 'done';
      channels: number;
      sampleRate: number;
      frames: number;
      engineVersion: number;
    }
  | { status: 'aborted' }
  | { status: 'failed'; error: unknown };

type OpenStream = { segment: MixPlanSegment; stream: TrackStream };

/** Adds the stretched track for `[chunkStart, chunkEnd)` into `channels`. */
const fillTrack = async (
  segments: readonly MixPlanSegment[],
  chunkStart: number,
  chunkEnd: number,
  channels: Float32Array[],
  gain: number,
  stretcher: TrackStretcher,
  openStreams: Map<MixPlanSegment, OpenStream>,
): Promise<void> => {
  for (const segment of segments) {
    if (segment.endFrame <= chunkStart || segment.startFrame >= chunkEnd) {
      continue;
    }

    const from = Math.max(segment.startFrame, chunkStart);
    const to = Math.min(segment.endFrame, chunkEnd);

    if (segment.kind === 'silence') {
      continue;
    }

    let open = openStreams.get(segment);

    if (!open) {
      open = {
        segment,
        stream: await stretcher.open({
          pitchSemitones: segment.pitchSemitones,
          rate: segment.rate,
          trackStartMs: segment.trackStartMs,
        }),
      };
      openStreams.set(segment, open);
    }

    const read = await open.stream.read(to - from);

    channels.forEach((channel, index) => {
      const source = read[index] ?? read[0];

      for (let frame = 0; frame < to - from; frame += 1) {
        channel[from - chunkStart + frame] = (source?.[frame] ?? 0) * gain;
      }
    });

    if (to === segment.endFrame) {
      open.stream.close();
      openStreams.delete(segment);
    }
  }
};

export const renderMix = async (
  options: RenderMixOptions,
): Promise<RenderMixResult> => {
  const { reader, stretcher, signal } = options;
  const plan = planMixRender(options.recording, stretcher.sampleRate);
  const chunkFrames = Math.max(1, options.chunkFrames ?? DEFAULT_CHUNK_FRAMES);
  const gains = balanceToGains(options.balance);
  const recordingGain = gains.recordingGain * (options.levelGain ?? UNIT_GAIN);
  const channelCount = stretcher.channels;
  const openStreams = new Map<MixPlanSegment, OpenStream>();
  // One limiter for the whole render, so its gain carries across chunks.
  const limiter = createMixLimiter(stretcher.sampleRate);

  try {
    for (let start = 0; start < plan.totalFrames; start += chunkFrames) {
      if (signal?.aborted) {
        return { status: 'aborted' };
      }

      const end = Math.min(plan.totalFrames, start + chunkFrames);
      const frames = end - start;
      const channels = Array.from(
        { length: channelCount },
        () => new Float32Array(frames),
      );

      await fillTrack(
        plan.segments,
        start,
        end,
        channels,
        gains.trackGain,
        stretcher,
        openStreams,
      );

      const recording = await readResampledWindow(
        reader,
        plan.recordingOffsetFrames,
        stretcher.sampleRate,
        start,
        end,
      );
      const interleaved = new Float32Array(frames * channelCount);

      for (let frame = 0; frame < frames; frame += 1) {
        const voice = (recording[frame] ?? 0) * recordingGain;

        channels.forEach((channel, index) => {
          interleaved[frame * channelCount + index] =
            (channel[frame] ?? 0) + voice;
        });
      }

      limiter.process(interleaved, channelCount);

      await options.write(floatToInt16(interleaved));
      options.onProgress?.(end, plan.totalFrames);
    }

    return {
      channels: channelCount,
      engineVersion: MIX_ENGINE_VERSION,
      frames: plan.totalFrames,
      sampleRate: stretcher.sampleRate,
      status: 'done',
    };
  } catch (error) {
    return { error, status: 'failed' };
  } finally {
    openStreams.forEach(({ stream }) => stream.close());
  }
};
