import {
  buildDriveMediaUrl,
  uploadDriveFileResumable,
} from '@org/google-drive';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { persistentAudioCache } from '../../playback/audio-cache';
import { getRecordingsStore } from '../recordings-store-instance';
import {
  resolveRecordingOriginal,
  type OriginalAudioDependencies,
} from '../recording-original';
import { recordDriveExportDone } from './record-drive-export';
import { decodeTrackAudio } from './decode-track-audio';
import type { ExportRunnerDependencies } from './recording-export-runner';
import { saveRecordingFile } from './save-recording-file';

const NOT_FOUND_PATTERN = /\b404\b/;
const WAV_BLOB_CONSTRUCTOR = Blob as unknown as new (
  parts: unknown[],
  options?: { type?: string },
) => Blob;

const isOnline = (): boolean =>
  (globalThis as { navigator?: { onLine?: boolean } }).navigator?.onLine !==
  false;

/**
 * Where the original track comes from: the audio the app already stored
 * (cache or kept offline), else Drive. A recording owns no copy
 * (rehearsal-recording design Decision 13).
 */
export const createOriginalAudioDependencies = (options: {
  accessToken: string | undefined;
  sources: readonly DriveLibrarySource[];
}): OriginalAudioDependencies => ({
  download: async (driveFileId) => {
    const response = await fetch(buildDriveMediaUrl(driveFileId), {
      headers: { Authorization: `Bearer ${options.accessToken ?? ''}` },
    });

    if (!response.ok) {
      throw new Error(`Track download failed (${response.status}).`);
    }

    return response.blob();
  },
  findLibraryTrack: (driveFileId) =>
    options.sources.find(
      (source) => source.driveFileId === driveFileId && !source.adjustment,
    ),
  isNotFound: (error) =>
    error instanceof Error && NOT_FOUND_PATTERN.test(error.message),
  isOnline,
  listStored: () => persistentAudioCache.list(),
  readStored: (driveFileId, version) =>
    persistentAudioCache.read(driveFileId, version),
});

/** Everything the export runner calls outside itself, for the running app. */
export const createRecordingExportDependencies = (options: {
  accessToken: string | undefined;
  sources: readonly DriveLibrarySource[];
}): ExportRunnerDependencies => {
  const originalDependencies = createOriginalAudioDependencies(options);

  return {
    decodeTrack: decodeTrackAudio,
    makeBlob: (parts, type) => new WAV_BLOB_CONSTRUCTOR(parts, { type }),
    readRecording: (id) => getRecordingsStore().getWavBlob(id),
    recordUploaded: (recording, entry) =>
      recordDriveExportDone(getRecordingsStore(), recording.id, {
        ...entry,
        now: new Date(),
      }),
    resolveOriginal: (recording) =>
      resolveRecordingOriginal(recording, originalDependencies),
    saveToDevice: saveRecordingFile,
    upload: uploadDriveFileResumable,
  };
};
