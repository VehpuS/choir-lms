import type { Recording } from '@org/audio-library-models';

import { formatByteSize } from '../offline/format-byte-size';
import type { LibraryFilesConfirmationDialogContent } from '../selection/library-files-confirmation-dialog';

/**
 * What Settings and the offline files view say about recordings
 * (rehearsal-recording design Decision 14). Recordings are never cache: there
 * is no size limit, no automatic removal, and only a delete action.
 */

export const RECORDINGS_STORAGE_COPY = {
  deleteLabel: 'Delete',
  emptyBody: 'Recordings you make are kept here until you delete them.',
  groupTitle: 'Recordings',
  neverRemovedNote: 'Recordings are never removed automatically',
  settingsSummary: 'Storage used by your recordings',
  settingsTitle: 'Recordings',
  usedTitle: 'Storage used',
} as const;

export type RecordingStorageSort = 'recent' | 'size';

export type RecordingStorageRow = {
  id: string;
  name: string;
  /** The track name as it was when recorded. */
  trackName: string;
  sizeBytes: number;
  sizeLabel: string;
};

export type RecordingsStorageSummary = {
  count: number;
  totalBytes: number;
  totalLabel: string;
  /** `61 MB · never removed automatically`, the offline files group line. */
  groupLine: string;
  rows: RecordingStorageRow[];
};

const toRow = (recording: Recording): RecordingStorageRow => ({
  id: recording.id,
  name: recording.name,
  trackName: recording.lineage.track.name,
  sizeBytes: recording.sizeBytes,
  sizeLabel: formatByteSize(recording.sizeBytes),
});

export const buildRecordingsStorageSummary = (
  recordings: readonly Recording[],
  sort: RecordingStorageSort = 'recent',
): RecordingsStorageSummary => {
  const ordered =
    sort === 'size'
      ? [...recordings].sort((a, b) => b.sizeBytes - a.sizeBytes)
      : [...recordings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const totalBytes = recordings.reduce((sum, r) => sum + r.sizeBytes, 0);
  const totalLabel = formatByteSize(totalBytes);

  return {
    count: recordings.length,
    totalBytes,
    totalLabel,
    groupLine: `${totalLabel} · ${RECORDINGS_STORAGE_COPY.neverRemovedNote.toLowerCase()}`,
    rows: ordered.map(toRow),
  };
};

export const getDeleteRecordingConfirmation = (
  row: Pick<RecordingStorageRow, 'name' | 'sizeLabel' | 'trackName'>,
): LibraryFilesConfirmationDialogContent => ({
  confirmLabel: RECORDINGS_STORAGE_COPY.deleteLabel,
  message: `This permanently removes “${row.name}” (${row.trackName}) from this device and frees ${row.sizeLabel}. Copies already exported to Drive are not deleted.`,
  title: `Delete “${row.name}”?`,
});
