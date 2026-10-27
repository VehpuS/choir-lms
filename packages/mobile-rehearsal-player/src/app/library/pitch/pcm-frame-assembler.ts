import type { PcmFrame } from './pcm-source-types';

/** About 46 ms at 44.1 kHz: enough periods of a bass voice for the estimator. */
export const PCM_FRAME_SIZE = 2048;
/** A new frame every ~23 ms, so a note change shows in well under 100 ms. */
export const PCM_FRAME_HOP = 1024;

export type FrameAssembler = {
  /**
   * Adds a block of samples (the audio worklet delivers 128 at a time) whose
   * first sample was captured at `blockStartSec`, and returns any frames it
   * completes.
   */
  push: (
    block: Float32Array,
    blockStartSec: number,
    sampleRate: number,
  ) => PcmFrame[];
  reset: () => void;
};

/** Turns small capture blocks into overlapping fixed-size analysis frames. */
export const createFrameAssembler = (
  frameSize: number = PCM_FRAME_SIZE,
  hop: number = PCM_FRAME_HOP,
): FrameAssembler => {
  const ring = new Float32Array(frameSize);
  let writeIndex = 0;
  let filled = 0;
  let sinceLastFrame = 0;

  const snapshot = (): Float32Array => {
    const samples = new Float32Array(frameSize);
    const oldest = filled < frameSize ? 0 : writeIndex;

    samples.set(ring.subarray(oldest), 0);
    samples.set(ring.subarray(0, oldest), frameSize - oldest);

    return samples;
  };

  return {
    push: (block, blockStartSec, sampleRate) => {
      const frames: PcmFrame[] = [];

      for (let index = 0; index < block.length; index++) {
        ring[writeIndex] = block[index];
        writeIndex = (writeIndex + 1) % frameSize;
        filled = Math.min(filled + 1, frameSize);
        sinceLastFrame += 1;

        if (filled === frameSize && sinceLastFrame >= hop) {
          sinceLastFrame = 0;
          frames.push({
            samples: snapshot(),
            sampleRate,
            captureTimeSec: blockStartSec + (index + 1) / sampleRate,
          });
        }
      }

      return frames;
    },
    reset: () => {
      writeIndex = 0;
      filled = 0;
      sinceLastFrame = 0;
    },
  };
};
