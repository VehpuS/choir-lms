import {
  MAX_RECORDING_LEVEL_DB,
  MIN_RECORDING_LEVEL_DB,
  linearToDb,
} from '@org/audio-library-models';

import type { PcmWindowReader } from './wav-window-reader.ts';

/**
 * Normalize (rehearsal-recording design Decision 21): find the loudest sample
 * of a stored recording and suggest the level that puts it at -1 dBFS. The scan
 * reads the recording a window at a time through the same reader the overlay
 * uses, so nothing is decoded whole and a long recording costs one window of
 * memory.
 */

/** Where Normalize puts the loudest sample: a little under full scale, leaving the limiter room. */
export const NORMALIZE_TARGET_DBFS = -1;
/** About a second of 44.1 kHz audio per read. */
export const DEFAULT_SCAN_WINDOW_SAMPLES = 44_100;
const LEVEL_DB_STEP = 10;

export type PeakScanResult =
  | { status: 'done'; /** Largest absolute sample, 0 to 1. */ peak: number }
  | { status: 'aborted' };

export const scanRecordingPeak = async (
  reader: PcmWindowReader,
  options: {
    windowSamples?: number;
    /** Checked between windows; abort to stop a scan the user no longer wants. */
    signal?: { aborted: boolean };
  } = {},
): Promise<PeakScanResult> => {
  const windowSamples = Math.max(
    1,
    Math.floor(options.windowSamples ?? DEFAULT_SCAN_WINDOW_SAMPLES),
  );
  let peak = 0;

  for (let start = 0; start < reader.sampleCount; start += windowSamples) {
    if (options.signal?.aborted) {
      return { status: 'aborted' };
    }

    const window = await reader.read(start, windowSamples);

    for (const sample of window) {
      peak = Math.max(peak, Math.abs(sample));
    }
  }

  return { peak: Math.min(1, peak), status: 'done' };
};

export type NormalizeResult =
  /** There is nothing to raise: the recording has no signal. */
  | { status: 'silent' }
  | {
      status: 'level';
      levelDb: number;
      /** False when the range ran out before the peak reached the target. */
      reachedTarget: boolean;
    };

/** The level that puts `peak` at the target, kept inside the level range. */
export const getNormalizeLevel = (peak: number): NormalizeResult => {
  if (!(peak > 0)) {
    return { status: 'silent' };
  }

  const wantedDb = NORMALIZE_TARGET_DBFS - linearToDb(peak);
  // Rounded down so the peak lands at or just under the target, never over it.
  const steppedDb = Math.floor(wantedDb * LEVEL_DB_STEP) / LEVEL_DB_STEP;
  const levelDb = Math.min(
    MAX_RECORDING_LEVEL_DB,
    Math.max(MIN_RECORDING_LEVEL_DB, steppedDb),
  );

  return { levelDb, reachedTarget: levelDb === steppedDb, status: 'level' };
};
