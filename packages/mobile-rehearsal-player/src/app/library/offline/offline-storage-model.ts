import type { AudioStoreEntry } from '../playback/audio-cache/audio-store-types';

export const UNKNOWN_OFFLINE_FILE_NAME = 'Unknown file';

export type OfflineFileRow = {
  driveFileId: string;
  kept: boolean;
  name: string;
  /** For a kept track: its score files, shown beneath it and removed with it. */
  scores?: OfflineFileRow[];
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
  const scoreRows = new Map<string, OfflineFileRow>();

  entries.forEach((entry, index) => {
    if (entry.kind === 'score' && rows[index]) {
      scoreRows.set(entry.driveFileId, rows[index]);
    }
  });

  const trackRows = rows.filter((row) => !scoreRows.has(row.driveFileId));
  const nestedScoreIds = new Set<string>();

  entries.forEach((entry) => {
    const scoreRow = scoreRows.get(entry.driveFileId);
    const owners = (entry.ownerIds ?? []).flatMap((ownerId) => {
      const owner = trackRows.find((row) => row.driveFileId === ownerId);

      return owner ? [owner] : [];
    });

    if (!scoreRow || owners.length === 0) {
      return;
    }

    nestedScoreIds.add(entry.driveFileId);
    owners.forEach((owner) => {
      owner.scores = [...(owner.scores ?? []), scoreRow].sort(bySizeDescending);
    });
  });

  // A score whose track is gone still takes space, so it keeps a row of its own.
  const orphanScores = [...scoreRows.values()].filter(
    (row) => !nestedScoreIds.has(row.driveFileId),
  );
  const kept = [...trackRows.filter((row) => row.kept), ...orphanScores].sort(
    compare,
  );
  const automatic = trackRows.filter((row) => !row.kept).sort(compare);

  return {
    automatic,
    kept,
    summary: {
      automaticBytes: sumBytes(automatic),
      budgetBytes,
      // Scores are counted once, however many tracks list them.
      keptBytes: sumBytes(rows.filter((row) => row.kept)),
    },
  };
};
