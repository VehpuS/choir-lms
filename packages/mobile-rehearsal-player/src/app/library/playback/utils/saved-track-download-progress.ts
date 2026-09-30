/**
 * Progress of the web media download that runs before a Drive track can play
 * (see `saved-track-web-download.ts`). Web playback fetches the whole file
 * into a blob first, so on a slow connection this is the only sign that
 * playback is on its way. Native streams directly and never publishes here.
 */
export type SavedTrackDownloadProgress =
  | { status: 'idle' }
  | {
      /** Lets a finished download clear only its own progress. */
      downloadId: number;
      isSlow: boolean;
      receivedBytes: number;
      startedAtMs: number;
      status: 'downloading';
      /** From `Content-Length`; null when the response does not say. */
      totalBytes: number | null;
    };

type Listener = () => void;

export const IDLE_SAVED_TRACK_DOWNLOAD_PROGRESS: SavedTrackDownloadProgress = {
  status: 'idle',
};

export const createSavedTrackDownloadProgressStore = () => {
  let snapshot: SavedTrackDownloadProgress = IDLE_SAVED_TRACK_DOWNLOAD_PROGRESS;
  const listeners = new Set<Listener>();

  return {
    getSnapshot() {
      return snapshot;
    },
    publish(nextSnapshot: SavedTrackDownloadProgress) {
      snapshot = nextSnapshot;

      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener: Listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export type SavedTrackDownloadProgressStore = ReturnType<
  typeof createSavedTrackDownloadProgressStore
>;

/** The app-wide store the web download publishes to and the shell reads. */
export const savedTrackDownloadProgressStore =
  createSavedTrackDownloadProgressStore();
