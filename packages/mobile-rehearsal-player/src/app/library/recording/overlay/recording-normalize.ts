import {
  createWavWindowReader,
  getNormalizeLevel,
  scanRecordingPeak,
  type BlobLike,
  type PcmWindowReader,
} from '@org/audio-mixing';

import { NORMALIZE_MESSAGES } from './recording-level-model';

export type NormalizeOutcome =
  | { status: 'set'; levelDb: number; message?: string }
  | { status: 'unchanged'; message: string }
  | { status: 'aborted' };

export type NormalizeDependencies = {
  /** The stored recording as a WAV blob, or null when its audio is missing. */
  getWavBlob: (recordingId: string) => Promise<BlobLike | null>;
  /** Opens the reader; replaced in specs that need a particular failure. */
  createReader?: (blob: BlobLike) => Promise<PcmWindowReader>;
};

/**
 * `Normalize`: scan the stored recording for its loudest sample and suggest the
 * level that puts it at -1 dBFS. It never changes anything itself; the caller
 * sets the level, which the user can move afterwards.
 */
export const normalizeRecording = async (
  recordingId: string,
  deps: NormalizeDependencies,
  signal?: { aborted: boolean },
): Promise<NormalizeOutcome> => {
  try {
    const blob = await deps.getWavBlob(recordingId);

    if (!blob) {
      return { message: NORMALIZE_MESSAGES.unreadable, status: 'unchanged' };
    }

    const reader = await (deps.createReader ?? createWavWindowReader)(blob);
    const scan = await scanRecordingPeak(reader, { signal });

    if (scan.status === 'aborted') {
      return { status: 'aborted' };
    }

    const level = getNormalizeLevel(scan.peak);

    if (level.status === 'silent') {
      return { message: NORMALIZE_MESSAGES.silent, status: 'unchanged' };
    }

    return {
      levelDb: level.levelDb,
      ...(level.reachedTarget ? {} : { message: NORMALIZE_MESSAGES.tooQuiet }),
      status: 'set',
    };
  } catch {
    return { message: NORMALIZE_MESSAGES.unreadable, status: 'unchanged' };
  }
};
