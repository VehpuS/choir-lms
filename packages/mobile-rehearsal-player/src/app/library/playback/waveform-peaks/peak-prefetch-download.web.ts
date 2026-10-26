import { createSavedTrackDownloadProgressStore } from '../utils/saved-track-download-progress';
import { startSavedTrackDownload } from '../utils/saved-track-web-download';
import type { PeakPrefetchRequest } from './peak-prefetch';

/**
 * A background download for analysis. It goes through the shared download, so
 * it reuses cached bytes and joins a download the player already started
 * rather than fetching the file twice. It has a progress store of its own and
 * opts out of reset cancellation, so the mini-player shows no loading state
 * for it and resetting the player does not cancel it.
 */
export const downloadAudioForPeaks = async (
  request: PeakPrefetchRequest,
): Promise<Blob | null> => {
  try {
    return await startSavedTrackDownload(
      { headers: request.headers, url: request.url },
      {
        clearTimer: (handle) => {
          clearTimeout(handle as ReturnType<typeof setTimeout>);
        },
        fetch: globalThis.fetch.bind(globalThis),
        now: () => Date.now(),
        setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
        store: createSavedTrackDownloadProgressStore(),
      },
      { cancelOnReset: false, version: request.version },
    );
  } catch {
    // The waveform stays a placeholder; playback is unaffected.
    return null;
  }
};
