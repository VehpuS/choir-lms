import { WEB_AUDIO_CACHE_BUDGET_BYTES } from '../audio-cache/audio-cache-budget';

type SavedTrackAudioCacheEntry = {
  blob: Blob;
  version: string;
};

export type SavedTrackAudioCache = {
  clear(): void;
  /** Drops one file's bytes (used when the user removes its offline copy). */
  delete(driveFileId: string): void;
  /** The cached bytes for this file at this version, marking them recently used. */
  get(driveFileId: string, version: string): Blob | null;
  set(driveFileId: string, version: string, blob: Blob): void;
  /** Total bytes held, for the storage view. */
  sizeBytes(): number;
};

/**
 * A size-capped, in-memory cache of downloaded Drive audio keyed by file id.
 * A read at a different version drops the stale entry, and a write evicts the
 * least recently used files until the budget holds. A file larger than the
 * whole budget is not kept.
 */
export const createSavedTrackAudioCache = (
  budgetBytes: number,
): SavedTrackAudioCache => {
  // Map iteration order is insertion order, so re-inserting on use keeps the
  // first entry the least recently used.
  const entries = new Map<string, SavedTrackAudioCacheEntry>();
  let totalBytes = 0;

  const remove = (driveFileId: string) => {
    const entry = entries.get(driveFileId);

    if (!entry) {
      return;
    }

    entries.delete(driveFileId);
    totalBytes -= entry.blob.size;
  };

  return {
    delete(driveFileId) {
      remove(driveFileId);
    },
    clear() {
      entries.clear();
      totalBytes = 0;
    },
    get(driveFileId, version) {
      const entry = entries.get(driveFileId);

      if (!entry) {
        return null;
      }

      if (entry.version !== version) {
        remove(driveFileId);

        return null;
      }

      entries.delete(driveFileId);
      entries.set(driveFileId, entry);

      return entry.blob;
    },
    set(driveFileId, version, blob) {
      remove(driveFileId);

      if (blob.size > budgetBytes) {
        return;
      }

      entries.set(driveFileId, { blob, version });
      totalBytes += blob.size;

      for (const [oldestId] of entries) {
        if (totalBytes <= budgetBytes) {
          break;
        }

        remove(oldestId);
      }
    },
    sizeBytes() {
      return totalBytes;
    },
  };
};

export const savedTrackAudioCache = createSavedTrackAudioCache(
  WEB_AUDIO_CACHE_BUDGET_BYTES,
);
