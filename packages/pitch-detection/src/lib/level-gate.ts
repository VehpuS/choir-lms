/** Estimates less periodic than this are treated as noise. */
export const MIN_CLARITY = 0.9;

/** The quietest the cutoff can be set, and the loudest worth asking for. */
export const MIN_LEVEL_CUTOFF_DB = -60;
export const MAX_LEVEL_CUTOFF_DB = -20;
/** About the old `Normal` preset (0.01 RMS). */
export const DEFAULT_LEVEL_CUTOFF_DB = -40;

/** What a silent frame reads, so a meter has a floor to draw from. */
export const SILENCE_DB = -100;

const DB_PER_DECADE = 20;

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

/** Converts an RMS level (0..1, full scale = 1) to dBFS; silence reads `SILENCE_DB`. */
export const rmsToDb = (rms: number): number =>
  rms <= 0 ? SILENCE_DB : Math.max(SILENCE_DB, DB_PER_DECADE * Math.log10(rms));

export const frameLevelDb = (frame: Float32Array): number =>
  rmsToDb(rootMeanSquare(frame));

export const clampLevelCutoffDb = (cutoffDb: number): number =>
  Math.min(MAX_LEVEL_CUTOFF_DB, Math.max(MIN_LEVEL_CUTOFF_DB, cutoffDb));
