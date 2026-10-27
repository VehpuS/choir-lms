export type Sensitivity = 'low' | 'normal' | 'high';

export type Gates = {
  /** Frames quieter than this (RMS, 0..1) are treated as silence. */
  minRms: number;
  /** Estimates less periodic than this are treated as noise. */
  minClarity: number;
};

export const DEFAULT_SENSITIVITY: Sensitivity = 'normal';

// Starting values; task 1.1 tunes them against real voices.
export const GATES_BY_SENSITIVITY: Record<Sensitivity, Gates> = {
  low: { minRms: 0.02, minClarity: 0.93 },
  normal: { minRms: 0.01, minClarity: 0.9 },
  high: { minRms: 0.004, minClarity: 0.85 },
};

/** Below the lowest bass note and above the highest soprano harmonic worth following. */
export const MIN_VOICE_HZ = 50;
export const MAX_VOICE_HZ = 1400;

export const rootMeanSquare = (frame: Float32Array): number => {
  if (frame.length === 0) {
    return 0;
  }

  let sumOfSquares = 0;

  for (const sample of frame) {
    sumOfSquares += sample * sample;
  }

  return Math.sqrt(sumOfSquares / frame.length);
};
