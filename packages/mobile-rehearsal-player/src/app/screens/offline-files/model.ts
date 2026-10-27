import {
  formatByteSize,
  formatPresetSize,
} from '../../library/offline/format-byte-size';
import type { LibraryFilesConfirmationDialogContent } from '../../library/selection/library-files-confirmation-dialog';
import type {
  OfflineFileRow,
  OfflineFileSort,
  OfflineStorageSummary,
} from '../../library/offline/offline-storage-model';

export const OFFLINE_FILES_COPY = {
  automaticTitle: 'Automatic',
  clearAllLabel: 'Clear all',
  clearAutomaticLabel: 'Clear automatic cache',
  closeLabel: 'Close offline files',
  emptyBody:
    'Play a track and it is saved here automatically. Choose "Keep offline" from a track or loop menu to keep a file on this device until you remove it.',
  emptyTitle: 'Nothing offline yet',
  keptTitle: 'Kept',
  removeLabel: 'Remove from offline',
  title: 'Offline files',
} as const;

export const OFFLINE_SORT_OPTIONS: ReadonlyArray<{
  label: string;
  value: OfflineFileSort;
}> = [
  { label: 'Recent', value: 'recent' },
  { label: 'Size', value: 'size' },
];

/** `4.0 MB of 250 MB`: the automatic cache against the chosen cache size. */
export const getAutomaticUsageLabel = (summary: OfflineStorageSummary) => {
  return `${formatByteSize(summary.automaticBytes)} of ${formatPresetSize(summary.budgetBytes)}`;
};

export const getKeptUsageLabel = (summary: OfflineStorageSummary) => {
  return `${formatByteSize(summary.keptBytes)} kept`;
};

const pluralFiles = (count: number) => {
  return count === 1 ? '1 file' : `${count} files`;
};

const totalBytes = (rows: readonly OfflineFileRow[]) => {
  return rows.reduce((total, row) => total + row.sizeBytes, 0);
};

export const getRemoveSelectionConfirmation = (
  rows: readonly OfflineFileRow[],
): LibraryFilesConfirmationDialogContent => {
  const keptCount = rows.filter((row) => row.kept).length;
  const keptNote = keptCount > 0 ? ` ${keptCount} kept offline.` : '';

  return {
    confirmLabel: 'Remove',
    message: `This frees ${formatByteSize(totalBytes(rows))}.${keptNote ? ` Includes${keptNote}` : ''} They will stream again until you play or keep them offline.`,
    title: `Remove ${pluralFiles(rows.length)} from offline?`,
  };
};

export const getClearAutomaticConfirmation = (
  rows: readonly OfflineFileRow[],
): LibraryFilesConfirmationDialogContent => ({
  confirmLabel: 'Clear',
  message: `This frees ${formatByteSize(totalBytes(rows))}. Files kept offline stay.`,
  title: 'Clear the automatic cache?',
});

export const getClearAllConfirmation = (
  rows: readonly OfflineFileRow[],
): LibraryFilesConfirmationDialogContent => ({
  confirmLabel: 'Clear all',
  message: `This removes ${pluralFiles(rows.length)} (${formatByteSize(totalBytes(rows))}), including files you kept offline.`,
  title: 'Clear all offline files?',
});
