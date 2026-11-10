import { encodePcmWav } from './pcm-wav';

// A generated tone as a WAV file, for browser scenarios that need audio of a
// known length and pitch without a committed binary (a ten-minute track is just
// `seconds: 600`). Mono, 16-bit PCM.
const DEFAULT_SAMPLE_RATE = 22_050;
const DEFAULT_HZ = 440;
// Quiet enough to be safe if it ever reaches speakers, loud enough to measure.
const DEFAULT_AMPLITUDE = 0.5;

export type ToneWavOptions = {
  /** 0 to 1 of full scale. */
  amplitude?: number;
  hz?: number;
  sampleRate?: number;
  seconds: number;
};

export const buildToneWav = (options: ToneWavOptions): Buffer => {
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const hz = options.hz ?? DEFAULT_HZ;
  const amplitude = options.amplitude ?? DEFAULT_AMPLITUDE;
  const sampleCount = Math.round(options.seconds * sampleRate);
  const angularStep = (2 * Math.PI * hz) / sampleRate;
  const samples = new Float32Array(sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    samples[index] = Math.sin(angularStep * index) * amplitude;
  }

  return encodePcmWav(samples, sampleRate);
};
