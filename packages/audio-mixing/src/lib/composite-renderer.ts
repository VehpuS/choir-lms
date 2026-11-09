import { MIX_ENGINE_VERSION } from './engine-version.ts';
import {
  planCompositeRender,
  type CompositeRenderShaping,
} from './composite-render-plan.ts';
import { createMixLimiter } from './mix-limiter.ts';
import { readResampledWindow } from './pcm-resampled-window.ts';
import { floatToInt16 } from './wav.ts';
import type { PcmWindowReader } from './wav-window-reader.ts';

/**
 * Renders a composite's current mix offline, a chunk at a time (composite-
 * tracks design Decision 13 and spike 1.4): every stem is read through its
 * window reader, placed by its offset and scaled by its gain, the stems are
 * summed in blocks, the sum is shaped by the speed and pitch, and the result
 * goes through the same mix limiter as a recording's export, so the level
 * matches what the live mix sounds like. Like `renderMix` it is a pure function
 * of its inputs: no session, cache or clock.
 */

const DEFAULT_CHUNK_SECONDS = 1;
/** Frames summed at a time before they are shaped (spike 1.4: block size barely matters). */
const SUM_BLOCK_FRAMES = 4096;
const MONO = 1;
const MS_PER_SECOND = 1000;

/** One stem of the render: mono audio, its place on the timeline and its gain. */
export type CompositeRenderStem = {
  id: string;
  offsetMs: number;
  /** Linear gain from the mix (mute and solo already resolved). */
  gain: number;
  reader: PcmWindowReader;
};

/** Shapes a summed mono stream in time and pitch; the app backs it with SoundTouch. */
export type SumStream = {
  /** Feeds summed mono frames at the shaper's rate; call it as often as needed. */
  push: (samples: Float32Array) => void;
  /** Shaped frames ready to read. */
  available: () => number;
  /** Exactly `frames` shaped frames; only call with `frames <= available()`. */
  read: (frames: number) => Float32Array;
  close: () => void;
};

export type SumShaper = {
  sampleRate: number;
  open: (shaping: CompositeRenderShaping) => Promise<SumStream>;
};

export type RenderCompositeOptions = {
  stems: readonly CompositeRenderStem[];
  shaping: CompositeRenderShaping;
  shaper: SumShaper;
  /** Output frames per chunk; defaults to one second. */
  chunkFrames?: number;
  signal?: AbortSignal;
  onProgress?: (framesDone: number, totalFrames: number) => void;
  /** Receives mono 16-bit samples in order; awaited before the next chunk. */
  write: (samples: Int16Array) => Promise<void> | void;
};

export type RenderCompositeResult =
  | {
      status: 'done';
      channels: 1;
      sampleRate: number;
      frames: number;
      engineVersion: number;
    }
  | { status: 'aborted' }
  | { status: 'failed'; error: unknown };

const isUnshaped = ({ rate, pitchSemitones }: CompositeRenderShaping) =>
  rate === 1 && pitchSemitones === 0;

/** The summed, gained stems for timeline frames `[start, end)` (before shaping). */
const sumStems = async (
  stems: readonly CompositeRenderStem[],
  sampleRate: number,
  start: number,
  end: number,
): Promise<Float32Array> => {
  const sum = new Float32Array(end - start);

  for (const stem of stems) {
    if (stem.gain === 0) {
      continue;
    }

    const offsetFrames = Math.round(
      (stem.offsetMs * sampleRate) / MS_PER_SECOND,
    );
    const window = await readResampledWindow(
      stem.reader,
      offsetFrames,
      sampleRate,
      start,
      end,
    );

    for (let frame = 0; frame < sum.length; frame += 1) {
      sum[frame] += (window[frame] ?? 0) * stem.gain;
    }
  }

  return sum;
};

export const renderComposite = async (
  options: RenderCompositeOptions,
): Promise<RenderCompositeResult> => {
  const { shaper, shaping, signal, stems } = options;
  const sampleRate = shaper.sampleRate;
  const plan = planCompositeRender(
    stems.map((stem) => ({
      offsetMs: stem.offsetMs,
      durationMs: stem.reader.durationMs,
    })),
    shaping,
    sampleRate,
  );
  const chunkFrames = Math.max(
    1,
    options.chunkFrames ?? sampleRate * DEFAULT_CHUNK_SECONDS,
  );
  // One limiter for the whole render, so its gain carries across chunks.
  const limiter = createMixLimiter(sampleRate);
  let stream: SumStream | null = null;
  let nextInputFrame = 0;

  try {
    // At speed 1 and no pitch change the sum is the output: no shaping stage.
    if (!isUnshaped(shaping)) {
      stream = await shaper.open(shaping);
    }

    for (let start = 0; start < plan.totalFrames; start += chunkFrames) {
      if (signal?.aborted) {
        return { status: 'aborted' };
      }

      const end = Math.min(plan.totalFrames, start + chunkFrames);
      let chunk: Float32Array;

      if (stream) {
        // Past the end of the stems the input is silence, which also flushes
        // the shaping stage's tail.
        while (stream.available() < end - start) {
          stream.push(
            await sumStems(
              stems,
              sampleRate,
              nextInputFrame,
              nextInputFrame + SUM_BLOCK_FRAMES,
            ),
          );
          nextInputFrame += SUM_BLOCK_FRAMES;
        }

        chunk = stream.read(end - start);
      } else {
        chunk = await sumStems(stems, sampleRate, start, end);
      }

      limiter.process(chunk, MONO);
      await options.write(floatToInt16(chunk));
      options.onProgress?.(end, plan.totalFrames);
    }

    return {
      channels: MONO,
      engineVersion: MIX_ENGINE_VERSION,
      frames: plan.totalFrames,
      sampleRate,
      status: 'done',
    };
  } catch (error) {
    return { error, status: 'failed' };
  } finally {
    stream?.close();
  }
};
