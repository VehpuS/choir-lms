import type { AudioStore, AudioStoreEntry } from './audio-store-types';

/** Files fall out of use rather than being rewritten on every read. */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

type PersistentAudioCacheOptions = {
  budgetBytes: number;
  now?: () => number;
  store: AudioStore;
};

export type PersistentAudioCache = {
  clear: () => Promise<void>;
  /** Every stored file's entry, without reading any audio. */
  list: () => Promise<AudioStoreEntry[]>;
  /**
   * Keeps a stored file through automatic eviction. False when the file is not
   * stored (it was never cached, or was too large for the budget).
   */
  pin: (driveFileId: string) => Promise<boolean>;
  /** The stored bytes for this file at this version, or null on a miss. */
  read: (driveFileId: string, sourceVersion: string) => Promise<Blob | null>;
  /** Removes one stored file, kept or not. */
  remove: (driveFileId: string) => Promise<void>;
  /** Runs after any change to what is stored; returns an unsubscribe. */
  subscribe: (listener: () => void) => () => void;
  unpin: (driveFileId: string) => Promise<void>;
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
  const listeners = new Set<() => void>();
  const notify = () => {
    listeners.forEach((listener) => {
      listener();
    });
  };
  const findEntry = async (driveFileId: string) => {
    const entries = await store.list();

    return entries.find((entry) => entry.driveFileId === driveFileId);
  };

  const evictOverBudget = async (protectedId: string) => {
    const entries = await store.list();
    let totalBytes = entries.reduce((total, entry) => {
      return total + entry.sizeBytes;
    }, 0);
    const oldestFirst = entries
      // Kept files stay even when they alone exceed the budget.
      .filter((entry) => entry.driveFileId !== protectedId && !entry.pinned)
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
      notify();
    },
    async list() {
      return store.list().catch(() => []);
    },
    async pin(driveFileId) {
      try {
        if (!(await findEntry(driveFileId))) {
          return false;
        }

        await store.setPinned(driveFileId, true);
        notify();

        return true;
      } catch {
        return false;
      }
    },
    async remove(driveFileId) {
      await store.remove(driveFileId).catch(() => undefined);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    async unpin(driveFileId) {
      await store.setPinned(driveFileId, false).catch(() => undefined);
      notify();
    },
    async read(driveFileId, sourceVersion) {
      try {
        const record = await store.read(driveFileId);

        if (!record) {
          return null;
        }

        if (record.entry.sourceVersion !== sourceVersion) {
          // A kept file is replaced by its next download (which keeps the
          // pin) rather than dropped, so the user's choice is not lost.
          if (!record.entry.pinned) {
            await store.remove(driveFileId);
            notify();
          }

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
        const previous = await findEntry(driveFileId);

        await store.write(
          {
            driveFileId,
            ...(previous?.pinned ? { pinned: true } : {}),
            sizeBytes: blob.size,
            sourceVersion,
            touchedAt: now(),
          },
          blob,
        );
        await evictOverBudget(driveFileId);
        notify();
      } catch {
        // A full or unavailable store leaves the in-memory copy in charge.
      }
    },
  };
};
