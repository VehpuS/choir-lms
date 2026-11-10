import { createPitchyEstimator } from '@org/pitch-detection';

// Measures what the app's audio output sounds like, without listening: pitch
// drift, clicks, dropouts, clipping and loudness over a captured mono signal.
// Built for steady test tones and the held-note stem. Clicks assume a smooth
// signal, so use it on tones rather than on speech with hard onsets.
const BLOCK_MS = 1;
const SILENT_BLOCK_RMS = 0.002;
const SOUND_LEVEL = 0.01;
const CLIPPED_LEVEL = 0.999;
const CLICK_FACTOR = 8;
const CLICK_REFERENCE_MS = 10;
const CLICK_MERGE_MS = 5;
const CLICK_FLOOR_SHARE = 0.1;
const PITCH_FRAME = 2048;
const PITCH_HOP = 1024;
const PITCH_MIN_CLARITY = 0.9;
const PITCH_MIN_LEVEL = 0.02;
const CENTS_PER_OCTAVE = 1200;
const MS_PER_SECOND = 1000;
const MIN_DB = -120;

export type AudioQualityReport = {
  /** Number of separate clicks (sudden jumps in a smooth signal). */
  clicks: number;
  /** Samples at or beyond full scale. */
  clippedSamples: number;
  /** The longest silent gap inside the sounding part, in milliseconds. */
  longestDropoutMs: number;
  /** RMS of the sounding part, in dBFS. */
  loudnessDb: number;
  peak: number;
  /** Median pitch of the clear frames, or null when none was clear. */
  pitchHz: number | null;
};

const rms = (samples: Float32Array, start: number, end: number): number => {
  let sum = 0;

  for (let index = start; index < end; index += 1) {
    sum += samples[index] * samples[index];
  }

  return end > start ? Math.sqrt(sum / (end - start)) : 0;
};

const toDb = (value: number): number =>
  value > 0 ? Math.max(MIN_DB, 20 * Math.log10(value)) : MIN_DB;

/** The first and last sample that carry sound, or null for silence. */
const soundingSpan = (
  samples: Float32Array,
): { end: number; start: number } | null => {
  const start = samples.findIndex((sample) => Math.abs(sample) >= SOUND_LEVEL);

  if (start < 0) {
    return null;
  }

  let end = samples.length - 1;

  while (Math.abs(samples[end]) < SOUND_LEVEL) {
    end -= 1;
  }

  return { end, start };
};

const longestDropoutMs = (
  samples: Float32Array,
  sampleRate: number,
  span: { end: number; start: number },
): number => {
  const blockSize = Math.max(
    1,
    Math.round((sampleRate * BLOCK_MS) / MS_PER_SECOND),
  );
  let longest = 0;
  let current = 0;

  for (let at = span.start; at + blockSize <= span.end; at += blockSize) {
    if (rms(samples, at, at + blockSize) < SILENT_BLOCK_RMS) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest * BLOCK_MS;
};

/**
 * Counts sudden jumps: points where the second difference is far larger than
 * the signal's recent smoothness. Nearby hits count as one click.
 */
const countClicks = (samples: Float32Array, sampleRate: number): number => {
  const second = new Float32Array(samples.length);

  for (let index = 1; index < samples.length - 1; index += 1) {
    second[index] =
      samples[index + 1] - 2 * samples[index] + samples[index - 1];
  }

  const reference = Math.max(
    2,
    Math.round((sampleRate * CLICK_REFERENCE_MS) / MS_PER_SECOND),
  );
  const merge = (sampleRate * CLICK_MERGE_MS) / MS_PER_SECOND;
  // Keeps silence before a smooth onset from reading as a click.
  const floor = rms(second, 0, second.length) * CLICK_FLOOR_SHARE;
  let clicks = 0;
  let lastClick = -Infinity;

  for (let index = reference; index < second.length - 1; index += 1) {
    const recent = Math.max(rms(second, index - reference, index), floor);

    if (Math.abs(second[index]) > CLICK_FACTOR * recent) {
      if (index - lastClick > merge) {
        clicks += 1;
      }

      lastClick = index;
    }
  }

  return clicks;
};

const medianPitchHz = (
  samples: Float32Array,
  sampleRate: number,
): number | null => {
  const estimator = createPitchyEstimator();
  const heard: number[] = [];

  for (
    let start = 0;
    start + PITCH_FRAME <= samples.length;
    start += PITCH_HOP
  ) {
    const frame = samples.subarray(start, start + PITCH_FRAME);

    if (rms(frame, 0, frame.length) < PITCH_MIN_LEVEL) {
      continue;
    }

    const estimate = estimator.estimate(frame, sampleRate);

    if (estimate && estimate.clarity >= PITCH_MIN_CLARITY) {
      heard.push(estimate.frequencyHz);
    }
  }

  if (heard.length === 0) {
    return null;
  }

  return heard.sort((a, b) => a - b)[Math.floor(heard.length / 2)];
};

export const analyzeAudioQuality = (
  samples: Float32Array,
  sampleRate: number,
): AudioQualityReport => {
  const span = soundingSpan(samples);
  const peak = samples.reduce(
    (max, sample) => Math.max(max, Math.abs(sample)),
    0,
  );

  return {
    clicks: countClicks(samples, sampleRate),
    clippedSamples: samples.filter(
      (sample) => Math.abs(sample) >= CLIPPED_LEVEL,
    ).length,
    longestDropoutMs: span ? longestDropoutMs(samples, sampleRate, span) : 0,
    loudnessDb: span ? toDb(rms(samples, span.start, span.end + 1)) : MIN_DB,
    peak,
    pitchHz: medianPitchHz(samples, sampleRate),
  };
};

/** How far `heardHz` is from `expectedHz`, in cents (positive is sharp). */
export const centsBetween = (heardHz: number, expectedHz: number): number =>
  CENTS_PER_OCTAVE * Math.log2(heardHz / expectedHz);
