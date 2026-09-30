import type { SavedTrackDownloadProgress } from './saved-track-download-progress';

const PERCENT = 100;

const getPercentReceived = (
  progress: Extract<SavedTrackDownloadProgress, { status: 'downloading' }>,
) => {
  if (!progress.totalBytes) {
    return null;
  }

  return Math.min(
    PERCENT,
    Math.floor((progress.receivedBytes / progress.totalBytes) * PERCENT),
  );
};

/**
 * The mini-player / sheet line while web playback downloads the active item
 * (8.33): progress first, then a slow-connection notice once the download has
 * run long enough to look stuck. Null when nothing is downloading.
 */
export const getPlaybackDownloadLabel = (
  progress: SavedTrackDownloadProgress,
) => {
  if (progress.status !== 'downloading') {
    return null;
  }

  const percent = getPercentReceived(progress);

  if (progress.isSlow) {
    return percent === null
      ? 'Slow connection · still downloading from Google Drive'
      : `Slow connection · ${percent}% downloaded`;
  }

  return percent === null
    ? 'Loading from Google Drive…'
    : `Loading from Google Drive · ${percent}%`;
};
