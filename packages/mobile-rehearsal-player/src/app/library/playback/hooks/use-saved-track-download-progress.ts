import { useSyncExternalStore } from 'react';

import { savedTrackDownloadProgressStore } from '../utils/saved-track-download-progress';

/** The web media download progress for the item about to play (8.33). */
export const useSavedTrackDownloadProgress = () => {
  return useSyncExternalStore(
    savedTrackDownloadProgressStore.subscribe,
    savedTrackDownloadProgressStore.getSnapshot,
  );
};
