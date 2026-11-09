import { decodeWav } from '@org/audio-mixing';
import type { LibraryBundle } from '@org/audio-library-models';

import {
  createRestoredRecordingId,
  toRestoredRecording,
  type RecordingRestoreContext,
} from './recording-restore-model';
import type {
  BundleProgress,
  BundleServiceDependencies,
} from './bundle-service-types';

export type RecordingRestoreOutcome = {
  restored: number;
  /** Already on this device from an earlier try of the same restore. */
  alreadyHere: number;
  /** Could not be downloaded, read or attached; the rest were still restored. */
  failed: number;
  cancelled: boolean;
};

/**
 * Downloads the chosen bundle recordings from Drive and stores them on this
 * device, attached to the tracks and loops the import or replace created.
 * Failures are counted, not fatal: the library is already in place. Ids derive
 * from `key`, so a retry skips what an earlier try restored.
 */
export const restoreBundleRecordings = async (
  deps: BundleServiceDependencies,
  options: {
    bundle: LibraryBundle;
    idMaps: RecordingRestoreContext['idMaps'];
    /** Stable for one import or replace and its retries. */
    key: string;
    signal?: AbortSignal;
    onProgress?: BundleProgress;
  },
): Promise<RecordingRestoreOutcome> => {
  const outcome: RecordingRestoreOutcome = {
    restored: 0,
    alreadyHere: 0,
    failed: 0,
    cancelled: false,
  };
  const recordings = options.bundle.recordings ?? [];

  if (recordings.length === 0 || !deps.library.recordingsSupported()) {
    return outcome;
  }

  options.onProgress?.('restoring-recordings');

  const input = await deps.library.load();
  const context: RecordingRestoreContext = {
    idMaps: options.idMaps,
    sources: input.sources,
    loops: input.loops,
    now: (deps.now?.() ?? new Date()).toISOString(),
  };

  for (const bundleRecording of recordings) {
    if (options.signal?.aborted) {
      outcome.cancelled = true;

      return outcome;
    }

    const id = createRestoredRecordingId(options.key, bundleRecording.id);
    const recording = toRestoredRecording(bundleRecording, id, context);

    if (!recording || bundleRecording.audio.kind !== 'drive') {
      outcome.failed += 1;
      continue;
    }

    if (await deps.library.hasRecording(id)) {
      outcome.alreadyHere += 1;
      continue;
    }

    const downloaded = await deps.drive.downloadAudio(
      bundleRecording.audio.driveFileId,
      options.signal,
    );

    if (downloaded.status === 'aborted') {
      outcome.cancelled = true;

      return outcome;
    }

    const decoded =
      downloaded.status === 'ok' ? decodeWav(downloaded.bytes) : null;

    if (!decoded?.ok || decoded.wav.channels !== 1) {
      outcome.failed += 1;
      continue;
    }

    try {
      await deps.library.saveRecording(recording, decoded.wav.samples);
      outcome.restored += 1;
    } catch {
      outcome.failed += 1;
    }
  }

  return outcome;
};
