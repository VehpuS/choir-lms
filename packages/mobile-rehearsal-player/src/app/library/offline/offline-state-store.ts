import type { AudioStoreEntry } from '../playback/audio-cache/audio-store-types';

/** Whether a file can be played without downloading it again, and why. */
export type OfflineState = 'available' | 'downloading' | 'kept' | 'none';

type Listener = () => void;

type OfflineStateSource = {
  list: () => Promise<AudioStoreEntry[]>;
  subscribe: (listener: Listener) => () => void;
};

export type OfflineStateStore = {
  getRevision: () => number;
  getState: (driveFileId: string) => OfflineState;
  /** Marks a file as downloading until the returned function is called. */
  markDownloading: (driveFileId: string) => () => void;
  /** Reads the stored files again; run on open, since storage can change. */
  refresh: () => Promise<void>;
  subscribe: (listener: Listener) => () => void;
};

/**
 * What each file's offline state is, for rows and menus. Stored files come
 * from the cache (and are re-read whenever it changes); downloads started by
 * `Keep offline` are tracked here because the cache only sees finished files.
 */
export const createOfflineStateStore = (
  source: OfflineStateSource,
): OfflineStateStore => {
  const stored = new Map<string, AudioStoreEntry>();
  const downloading = new Map<string, number>();
  const listeners = new Set<Listener>();
  let revision = 0;

  const publish = () => {
    revision += 1;
    listeners.forEach((listener) => {
      listener();
    });
  };

  const refresh = async () => {
    const entries = await source.list();

    stored.clear();
    entries.forEach((entry) => {
      stored.set(entry.driveFileId, entry);
    });
    publish();
  };

  source.subscribe(() => {
    void refresh();
  });

  return {
    getRevision: () => revision,
    getState: (driveFileId) => {
      if (downloading.has(driveFileId)) {
        return 'downloading';
      }

      const entry = stored.get(driveFileId);

      if (!entry) {
        return 'none';
      }

      return entry.pinned ? 'kept' : 'available';
    },
    markDownloading: (driveFileId) => {
      downloading.set(driveFileId, (downloading.get(driveFileId) ?? 0) + 1);
      publish();

      return () => {
        const remaining = (downloading.get(driveFileId) ?? 1) - 1;

        if (remaining <= 0) {
          downloading.delete(driveFileId);
        } else {
          downloading.set(driveFileId, remaining);
        }

        publish();
      };
    },
    refresh,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};
