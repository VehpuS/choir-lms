import {
  recordExportDone,
  recordExportFailure,
  type RecordingExportKind,
} from '@org/audio-library-models';

import type { RecordingsStore } from '../recordings-store-types';

/**
 * Writes what an export did into the recording's export record
 * (rehearsal-recording design Decision 19). The manual dialog and the
 * background queue both call these, so `On Drive` and the no-duplicate rule
 * hold whichever way a copy got there. A download is never recorded.
 */

type ExportRecordStore = Pick<RecordingsStore, 'modify'>;

export const recordDriveExportDone = (
  store: ExportRecordStore,
  recordingId: string,
  entry: {
    kind: RecordingExportKind;
    file: { id: string; name: string };
    folder: { folderId: string; folderName: string };
    now: Date;
  },
): Promise<void> =>
  store.modify(recordingId, (recording) => ({
    exports: recordExportDone(recording, {
      driveFileId: entry.file.id,
      exportedAt: entry.now.toISOString(),
      fileName: entry.file.name,
      folderId: entry.folder.folderId,
      folderName: entry.folder.folderName,
      kind: entry.kind,
    }),
  }));

export const recordDriveExportFailure = (
  store: ExportRecordStore,
  recordingId: string,
  entry: { kind: RecordingExportKind; reason: string; now: Date },
): Promise<void> =>
  store.modify(recordingId, (recording) => ({
    exports: recordExportFailure(recording, {
      failedAt: entry.now.toISOString(),
      kind: entry.kind,
      reason: entry.reason,
    }),
  }));
