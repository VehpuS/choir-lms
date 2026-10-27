import {
  IDLE_SAVED_TRACK_DOWNLOAD_PROGRESS,
  type SavedTrackDownloadProgress,
  type SavedTrackDownloadProgressStore,
} from './saved-track-download-progress';

// A shared download serves several callers, each with its own progress store
// (the player's, a background waveform prefetch's). Progress goes to every
// waiter's store, so a player that joins a background download still shows
// it. A store is cleared only while it still shows this download.
export const createFanOutProgressStore = (
  getStores: () => SavedTrackDownloadProgressStore[],
): SavedTrackDownloadProgressStore => {
  let snapshot: SavedTrackDownloadProgress = IDLE_SAVED_TRACK_DOWNLOAD_PROGRESS;

  return {
    getSnapshot: () => snapshot,
    publish(next) {
      const previous = snapshot;

      snapshot = next;

      for (const store of getStores()) {
        if (next.status !== 'idle') {
          store.publish(next);
        } else if (previous.status === 'downloading') {
          clearStoreIfShowing(store, previous.downloadId);
        }
      }
    },
    subscribe: () => () => undefined,
  };
};

export const clearStoreIfShowing = (
  store: SavedTrackDownloadProgressStore,
  downloadId: number,
) => {
  const current = store.getSnapshot();

  if (current.status === 'downloading' && current.downloadId === downloadId) {
    store.publish(IDLE_SAVED_TRACK_DOWNLOAD_PROGRESS);
  }
};
