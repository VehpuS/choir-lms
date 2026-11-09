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

// A track's kept scores go with it, so they count too; a score shared by two
// selected tracks counts once. (One shared with a track left kept is counted
// although it stays, so the figure can run a little high.)
const totalBytes = (rows: readonly OfflineFileRow[]) => {
  const counted = new Set<string>();
  let total = 0;

  for (const row of rows) {
    for (const file of [row, ...(row.scores ?? [])]) {
      if (!counted.has(file.driveFileId)) {
        counted.add(file.driveFileId);
        total += file.sizeBytes;
      }
    }
  }

  return total;
};

export const getRemoveSelectionConfirmation = (
  rows: readonly OfflineFileRow[],
): LibraryFilesConfirmationDialogContent => {
  const keptCount = rows.filter((row) => row.kept).length;
  const freed = `This frees ${formatByteSize(totalBytes(rows))}`;

  // Kept files only stream again until the user keeps them once more, which
  // differs from automatic ones, so the warning names the rule.
  const message =
    keptCount > 0
      ? `${freed}, including ${pluralFiles(keptCount)} you kept offline. Kept files will stream again until you keep them offline again.`
      : `${freed}. They will stream again until you play or keep them offline.`;

  return {
    confirmLabel: 'Remove',
    message,
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

type PreparedUsage = { count: number; totalBytes: number };

const pluralComposites = (count: number) => {
  return count === 1 ? '1 composite' : `${count} composites`;
};

/**
 * `Clear all` also clears prepared composite stems (composite-tracks 9.1), and
 * the confirmation says so, and says that nothing but that cache is lost.
 */
export const getClearAllConfirmation = (
  rows: readonly OfflineFileRow[],
  prepared: PreparedUsage = { count: 0, totalBytes: 0 },
): LibraryFilesConfirmationDialogContent => {
  const files =
    rows.length > 0
      ? `This removes ${pluralFiles(rows.length)} (${formatByteSize(totalBytes(rows))}), including files you kept offline.`
      : undefined;
  const preparedNote =
    prepared.count > 0
      ? `${files ? 'It also removes' : 'This removes'} the prepared audio of ${pluralComposites(prepared.count)} (${formatByteSize(prepared.totalBytes)}). Composites, tracks and recordings stay, and a composite prepares again the next time you play it.`
      : undefined;

  return {
    confirmLabel: 'Clear all',
    message: [files, preparedNote].filter(Boolean).join(' '),
    title: 'Clear all offline files?',
  };
};
