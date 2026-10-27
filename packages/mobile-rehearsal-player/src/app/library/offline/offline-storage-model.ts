import type { AudioStoreEntry } from '../playback/audio-cache/audio-store-types';

export const UNKNOWN_OFFLINE_FILE_NAME = 'Unknown file';

export type OfflineFileRow = {
  driveFileId: string;
  kept: boolean;
  name: string;
  sizeBytes: number;
  touchedAt: number;
};

export type OfflineStorageSummary = {
  /** Automatic files only: the part the cache size limits. */
  automaticBytes: number;
  budgetBytes: number;
  /** Kept files are stored apart from the cache size and never limited by it. */
  keptBytes: number;
};

export type OfflineFileSort = 'recent' | 'size';

export type OfflineStorageSnapshot = {
  automatic: OfflineFileRow[];
  kept: OfflineFileRow[];
  summary: OfflineStorageSummary;
};

const bySizeDescending = (left: OfflineFileRow, right: OfflineFileRow) => {
  return right.sizeBytes - left.sizeBytes;
};

const byMostRecent = (left: OfflineFileRow, right: OfflineFileRow) => {
  return right.touchedAt - left.touchedAt;
};

const sumBytes = (rows: readonly OfflineFileRow[]) => {
  return rows.reduce((total, row) => total + row.sizeBytes, 0);
};

/**
 * Turns stored entries into the two sections of the offline files view. A name
 * recorded with the file wins; otherwise the library's name for the Drive file
 * is used, and a file the library no longer lists reads as unknown.
 */
export const buildOfflineStorageSnapshot = ({
  budgetBytes,
  entries,
  libraryNames,
  sort,
}: {
  budgetBytes: number;
  entries: readonly AudioStoreEntry[];
  libraryNames: ReadonlyMap<string, string>;
  sort: OfflineFileSort;
}): OfflineStorageSnapshot => {
  const compare = sort === 'size' ? bySizeDescending : byMostRecent;
  const rows = entries.map((entry): OfflineFileRow => {
    return {
      driveFileId: entry.driveFileId,
      kept: entry.pinned === true,
      name:
        entry.name ??
        libraryNames.get(entry.driveFileId) ??
        UNKNOWN_OFFLINE_FILE_NAME,
      sizeBytes: entry.sizeBytes,
      touchedAt: entry.touchedAt,
    };
  });
  const kept = rows.filter((row) => row.kept).sort(compare);
  const automatic = rows.filter((row) => !row.kept).sort(compare);

  return {
    automatic,
    kept,
    summary: {
      automaticBytes: sumBytes(automatic),
      budgetBytes,
      keptBytes: sumBytes(kept),
    },
  };
};
