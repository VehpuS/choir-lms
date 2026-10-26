import type { AudioStore } from './audio-store-types';

/** Files fall out of use rather than being rewritten on every read. */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

type PersistentAudioCacheOptions = {
  budgetBytes: number;
  now?: () => number;
  store: AudioStore;
};

export type PersistentAudioCache = {
  clear: () => Promise<void>;
  /** The stored bytes for this file at this version, or null on a miss. */
  read: (driveFileId: string, sourceVersion: string) => Promise<Blob | null>;
  write: (
    driveFileId: string,
    sourceVersion: string,
    blob: Blob,
  ) => Promise<void>;
};

/**
 * A versioned, size-capped store of downloaded audio keyed by Drive file. A
 * read at a different version drops the stale file, and a write evicts the
 * least recently used files past the budget. A storage failure is a miss,
 * never an error: playback must not depend on the cache.
 */
export const createPersistentAudioCache = ({
  budgetBytes,
  now = Date.now,
  store,
}: PersistentAudioCacheOptions): PersistentAudioCache => {
  const evictOverBudget = async (protectedId: string) => {
    const entries = await store.list();
    let totalBytes = entries.reduce((total, entry) => {
      return total + entry.sizeBytes;
    }, 0);
    const oldestFirst = entries
      .filter((entry) => entry.driveFileId !== protectedId)
      .sort((left, right) => left.touchedAt - right.touchedAt);

    for (const entry of oldestFirst) {
      if (totalBytes <= budgetBytes) {
        return;
      }

      await store.remove(entry.driveFileId);
      totalBytes -= entry.sizeBytes;
    }
  };

  return {
    async clear() {
      await store.clear().catch(() => undefined);
    },
    async read(driveFileId, sourceVersion) {
      try {
        const record = await store.read(driveFileId);

        if (!record) {
          return null;
        }

        if (record.entry.sourceVersion !== sourceVersion) {
          await store.remove(driveFileId);

          return null;
        }

        if (now() - record.entry.touchedAt > TOUCH_INTERVAL_MS) {
          await store.touch(driveFileId, now());
        }

        return record.blob;
      } catch {
        return null;
      }
    },
    async write(driveFileId, sourceVersion, blob) {
      // A file larger than the whole budget would only evict everything else.
      if (blob.size > budgetBytes) {
        return;
      }

      try {
        await store.write(
          {
            driveFileId,
            sizeBytes: blob.size,
            sourceVersion,
            touchedAt: now(),
          },
          blob,
        );
        await evictOverBudget(driveFileId);
      } catch {
        // A full or unavailable store leaves the in-memory copy in charge.
      }
    },
  };
};
