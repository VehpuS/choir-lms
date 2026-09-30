export type SavedTrackDownloadedEvent = {
  blob: Blob;
  /** The Drive file id parsed from the request, or null for another host. */
  driveFileId: string | null;
};

type SavedTrackDownloadListener = (event: SavedTrackDownloadedEvent) => void;

const listeners = new Set<SavedTrackDownloadListener>();

/** Announces a finished web download, so analysis can reuse its bytes. */
export const emitSavedTrackDownloaded = (event: SavedTrackDownloadedEvent) => {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // A failing subscriber must never break playback.
    }
  }
};

export const subscribeToSavedTrackDownloads = (
  listener: SavedTrackDownloadListener,
) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
