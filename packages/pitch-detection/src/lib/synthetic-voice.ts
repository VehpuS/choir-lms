/** Synthetic audio for specs: sines, vibrato, noise and silence as frames. */

import type { PitchFrame } from './pitch-pipeline.ts';

export const TEST_SAMPLE_RATE = 44100;
export const TEST_FRAME_SIZE = 2048;
/** Frames advance by this many samples, so one frame is about 23 ms apart. */
export const TEST_HOP = 1024;

const TWO_PI = Math.PI * 2;

/** Samples of a tone whose frequency may change over time (for vibrato). */
export const renderTone = ({
  frequencyAt,
  seconds,
  amplitude = 0.5,
  sampleRate = TEST_SAMPLE_RATE,
}: {
  frequencyAt: (timeSeconds: number) => number;
  seconds: number;
  amplitude?: number;
  sampleRate?: number;
}): Float32Array => {
  const samples = new Float32Array(Math.round(seconds * sampleRate));
  let phase = 0;

  for (let index = 0; index < samples.length; index++) {
    phase += (TWO_PI * frequencyAt(index / sampleRate)) / sampleRate;
    samples[index] = amplitude * Math.sin(phase);
  }

  return samples;
};

export const renderSine = (
  frequencyHz: number,
  seconds: number,
  amplitude = 0.5,
): Float32Array => {
  return renderTone({ frequencyAt: () => frequencyHz, seconds, amplitude });
};

export const renderSilence = (seconds: number): Float32Array => {
  return new Float32Array(Math.round(seconds * TEST_SAMPLE_RATE));
};

/** Deterministic white noise (a small linear congruential generator). */
export const renderNoise = (seconds: number, amplitude = 0.3): Float32Array => {
  const samples = new Float32Array(Math.round(seconds * TEST_SAMPLE_RATE));
  let seed = 12345;

  for (let index = 0; index < samples.length; index++) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    samples[index] = amplitude * ((seed / 4294967296) * 2 - 1);
  }

  return samples;
};

export const concatSamples = (...parts: Float32Array[]): Float32Array => {
  const all = new Float32Array(
    parts.reduce((sum, part) => sum + part.length, 0),
  );
  let offset = 0;

  for (const part of parts) {
    all.set(part, offset);
    offset += part.length;
  }

  return all;
};

/** Cuts a signal into overlapping frames with capture times. */
export const toFrames = (samples: Float32Array): PitchFrame[] => {
  const frames: PitchFrame[] = [];

  for (
    let start = 0;
    start + TEST_FRAME_SIZE <= samples.length;
    start += TEST_HOP
  ) {
    frames.push({
      samples: samples.subarray(start, start + TEST_FRAME_SIZE),
      sampleRate: TEST_SAMPLE_RATE,
      timestampMs: ((start + TEST_FRAME_SIZE) / TEST_SAMPLE_RATE) * 1000,
    });
  }

  return frames;
};
