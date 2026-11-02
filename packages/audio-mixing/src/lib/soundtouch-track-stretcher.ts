import type * as SoundTouchCore from '@soundtouchjs/core';

import type { TrackStream, TrackStretcher } from './mix-renderer.ts';

/**
 * A `TrackStretcher` over a decoded track, using SoundTouch's pure-JS core
 * (rehearsal-recording design Decision 12). The track plays at the recording's
 * stored rate with its pitch kept (the `Stretch` stage, as the media element
 * does live with `preservesPitch`), then the stored pitch shift is applied
 * (the `SoundTouch` stage, as the live pitch node does). Nothing here reads a
 * clock or the live session, so a run is repeatable.
 */

const MS_PER_SECOND = 1000;
const INPUT_BLOCK_FRAMES = 4096;
const DRAIN_FRAMES = 8192;
const STEREO = 2;
const MAX_CHANNELS = 2;

/** The original track after decoding: one or two channels of float samples. */
export type DecodedTrack = {
  sampleRate: number;
  channels: Float32Array[];
};

type FrameBuffer = {
  readonly frameCount: number;
  extract: (
    output: Float32Array,
    position?: number,
    numFrames?: number,
  ) => void;
  receive: (numFrames?: number) => void;
  putSamples: (
    samples: Float32Array,
    position?: number,
    numFrames?: number,
  ) => void;
};

/** Moves everything `from` holds into `into` (or a callback) in blocks. */
const drain = (
  from: FrameBuffer,
  scratch: Float32Array,
  take: (block: Float32Array, frames: number) => void,
): void => {
  while (from.frameCount > 0) {
    const frames = Math.min(DRAIN_FRAMES, from.frameCount);

    from.extract(scratch, 0, frames);
    take(scratch, frames);
    from.receive(frames);
  }
};

const openStream = (
  core: typeof SoundTouchCore,
  track: DecodedTrack,
  request: Parameters<TrackStretcher['open']>[0],
): TrackStream => {
  const stretch = new core.Stretch({
    createBuffers: true,
    sampleRate: track.sampleRate,
  });
  const pitch = new core.SoundTouch({ sampleRate: track.sampleRate });
  const outputChannels = Math.min(track.channels.length, MAX_CHANNELS);
  const left = track.channels[0];
  const right = track.channels[1] ?? left;
  let sourceFrame = Math.max(
    0,
    Math.round((request.trackStartMs * track.sampleRate) / MS_PER_SECOND),
  );
  const scratch = new Float32Array(DRAIN_FRAMES * STEREO);
  const input = new Float32Array(INPUT_BLOCK_FRAMES * STEREO);
  // Shaped frames not yet handed out, interleaved stereo.
  let pending = new Float32Array(0);
  let pendingStart = 0;

  stretch.tempo = request.rate;
  pitch.pitchSemitones = request.pitchSemitones;

  const feedBlock = () => {
    // Past the end of the track the input is silence, which also flushes the
    // pipeline's tail.
    for (let frame = 0; frame < INPUT_BLOCK_FRAMES; frame += 1) {
      input[frame * STEREO] = left?.[sourceFrame + frame] ?? 0;
      input[frame * STEREO + 1] = right?.[sourceFrame + frame] ?? 0;
    }

    sourceFrame += INPUT_BLOCK_FRAMES;
    stretch.inputBuffer?.putSamples(input, 0, INPUT_BLOCK_FRAMES);
    stretch.process();

    if (stretch.outputBuffer) {
      drain(stretch.outputBuffer, scratch, (block, frames) => {
        pitch.inputBuffer.putSamples(block, 0, frames);
      });
    }

    pitch.process();
    drain(pitch.outputBuffer, scratch, (block, frames) => {
      const kept = pending.length - pendingStart;
      const merged = new Float32Array(kept + frames * STEREO);

      merged.set(pending.subarray(pendingStart), 0);
      merged.set(block.subarray(0, frames * STEREO), kept);
      pending = merged;
      pendingStart = 0;
    });
  };

  return {
    close: () => {
      stretch.clear();
      pitch.clear();
      pending = new Float32Array(0);
    },
    read: async (frames) => {
      while ((pending.length - pendingStart) / STEREO < frames) {
        feedBlock();
      }

      const channels = Array.from(
        { length: outputChannels },
        () => new Float32Array(frames),
      );

      for (let frame = 0; frame < frames; frame += 1) {
        channels.forEach((channel, index) => {
          channel[frame] = pending[pendingStart + frame * STEREO + index] ?? 0;
        });
      }

      pendingStart += frames * STEREO;

      return channels;
    },
  };
};

export const createSoundTouchStretcher = (
  track: DecodedTrack,
): TrackStretcher => ({
  channels: Math.min(track.channels.length, MAX_CHANNELS),
  // Loaded when a render starts, so the app's startup does not carry
  // SoundTouch and a CommonJS test runner never has to resolve it.
  open: async (request) =>
    openStream(await import('@soundtouchjs/core'), track, request),
  sampleRate: track.sampleRate,
});
