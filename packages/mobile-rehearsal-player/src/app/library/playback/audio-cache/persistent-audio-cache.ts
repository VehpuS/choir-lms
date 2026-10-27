import {
  resolveAudioCacheBudget,
  type AudioCacheBudget,
} from './audio-cache-budget';
import type { AudioStore, AudioStoreEntry } from './audio-store-types';

/** Files fall out of use rather than being rewritten on every read. */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

type PersistentAudioCacheOptions = {
  /** A getter lets the user change the cache size while the app runs. */
  budgetBytes: AudioCacheBudget;
  now?: () => number;
  store: AudioStore;
};

export type PersistentAudioCache = {
  /** Removes every automatic (not kept) file. */
  clearAutomatic: () => Promise<void>;
  clear: () => Promise<void>;
  /** Evicts least recently used automatic files until the current size holds. */
  enforceBudget: () => Promise<void>;
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
  /**
   * Stores a file. `keep` stores it pinned even when it is larger than the
   * whole cache size: kept files are not part of the automatic cache. `name`
   * is the Drive file name, shown in the offline files view.
   */
  write: (
    driveFileId: string,
    sourceVersion: string,
    blob: Blob,
    options?: { keep?: boolean; name?: string },
  ) => Promise<void>;
};

/**
 * A versioned store of downloaded audio keyed by Drive file. The budget caps
 * the automatic files only: a write evicts the least recently used automatic
 * files past it, while kept (pinned) files are stored apart from that size and
 * never evicted. A read at a different version drops a stale automatic file.
 * A storage failure is a miss, never an error: playback must not depend on
 * the cache.
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

  // Writes and pin changes run one at a time, so a background write of a file
  // can never land on top of (and unpin) a keep that finished first.
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <Result>(task: () => Promise<Result>): Promise<Result> => {
    const result = queue.then(task, task);

    queue = result.catch(() => undefined);

    return result;
  };

  const evictOverBudget = async (protectedId?: string) => {
    const limitBytes = resolveAudioCacheBudget(budgetBytes);
    const entries = await store.list();
    // Only automatic files count toward the budget; kept files are separate.
    let totalBytes = entries.reduce((total, entry) => {
      return entry.pinned ? total : total + entry.sizeBytes;
    }, 0);
    const oldestFirst = entries
      .filter((entry) => entry.driveFileId !== protectedId && !entry.pinned)
      .sort((left, right) => left.touchedAt - right.touchedAt);

    for (const entry of oldestFirst) {
      if (totalBytes <= limitBytes) {
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
    clearAutomatic: () =>
      enqueue(async () => {
        try {
          const entries = await store.list();

          for (const entry of entries) {
            if (!entry.pinned) {
              await store.remove(entry.driveFileId);
            }
          }
        } catch {
          // Whatever could not be removed stays listed in the view.
        }

        notify();
      }),
    enforceBudget: () =>
      enqueue(async () => {
        try {
          await evictOverBudget();
        } catch {
          // A failed eviction leaves the cache over its size until the next write.
        }

        notify();
      }),
    async list() {
      return store.list().catch(() => []);
    },
    pin: (driveFileId) =>
      enqueue(async () => {
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
      }),
    remove: (driveFileId) =>
      enqueue(async () => {
        await store.remove(driveFileId).catch(() => undefined);
        notify();
      }),
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    unpin: (driveFileId) =>
      enqueue(async () => {
        await store.setPinned(driveFileId, false).catch(() => undefined);
        notify();
      }),
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
    write: (driveFileId, sourceVersion, blob, options) =>
      enqueue(async () => {
        try {
          const previous = await findEntry(driveFileId);
          // A file that is already kept stays kept when it is downloaded again.
          const keep = options?.keep === true || previous?.pinned === true;

          // An automatic file larger than the whole budget would only evict
          // everything else; a kept file is not bound by the budget.
          if (!keep && blob.size > resolveAudioCacheBudget(budgetBytes)) {
            return;
          }

          // A later download that does not know the name keeps the one stored.
          const name = options?.name ?? previous?.name;

          await store.write(
            {
              driveFileId,
              ...(name ? { name } : {}),
              ...(keep ? { pinned: true } : {}),
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
      }),
  };
};
