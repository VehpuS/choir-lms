import type * as SoundTouchCore from '@soundtouchjs/core';

import type { SumShaper, SumStream } from './composite-renderer.ts';

/**
 * A `SumShaper` over SoundTouch's pure-JS core (composite-tracks design
 * Decision 13, spike 1.4): the summed stems play at the speed with their pitch
 * kept (the `Stretch` stage, as the live media element does), then the pitch
 * shift is applied (the `SoundTouch` stage, as the live pitch node does), the
 * same two stages `createSoundTouchStretcher` runs for a recording. The mix is
 * mono; SoundTouch takes interleaved stereo, so the signal is doubled in and
 * the left channel taken out.
 */

const DRAIN_FRAMES = 8192;
const STEREO = 2;

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

const openSumStream = (
  core: typeof SoundTouchCore,
  sampleRate: number,
  request: Parameters<SumShaper['open']>[0],
): SumStream => {
  const stretch = new core.Stretch({ createBuffers: true, sampleRate });
  const pitch = new core.SoundTouch({ sampleRate });
  const scratch = new Float32Array(DRAIN_FRAMES * STEREO);
  // Shaped mono frames not yet handed out.
  let pending = new Float32Array(0);
  let pendingStart = 0;

  stretch.tempo = request.rate;
  pitch.pitchSemitones = request.pitchSemitones;

  return {
    available: () => pending.length - pendingStart,
    close: () => {
      stretch.clear();
      pitch.clear();
      pending = new Float32Array(0);
    },
    push: (samples) => {
      const input = new Float32Array(samples.length * STEREO);

      for (let frame = 0; frame < samples.length; frame += 1) {
        input[frame * STEREO] = samples[frame] ?? 0;
        input[frame * STEREO + 1] = samples[frame] ?? 0;
      }

      stretch.inputBuffer?.putSamples(input, 0, samples.length);
      stretch.process();

      if (stretch.outputBuffer) {
        drain(stretch.outputBuffer, scratch, (block, frames) => {
          pitch.inputBuffer.putSamples(block, 0, frames);
        });
      }

      pitch.process();
      drain(pitch.outputBuffer, scratch, (block, frames) => {
        const kept = pending.length - pendingStart;
        const merged = new Float32Array(kept + frames);

        merged.set(pending.subarray(pendingStart), 0);

        for (let frame = 0; frame < frames; frame += 1) {
          merged[kept + frame] = block[frame * STEREO] ?? 0;
        }

        pending = merged;
        pendingStart = 0;
      });
    },
    read: (frames) => {
      const out = pending.slice(pendingStart, pendingStart + frames);

      pendingStart += frames;

      return out;
    },
  };
};

export const createSoundTouchSumShaper = (sampleRate: number): SumShaper => ({
  // Loaded when a render starts, like the recording stretcher, so startup does
  // not carry SoundTouch and a CommonJS test runner never has to resolve it.
  open: async (shaping) =>
    openSumStream(await import('@soundtouchjs/core'), sampleRate, shaping),
  sampleRate,
});
