import { createSavedTrackDownloadProgressStore } from '../utils/saved-track-download-progress';
import { downloadSavedTrackBlob } from '../utils/saved-track-web-download';
import type { PeakPrefetchRequest } from './peak-prefetch';

/**
 * A background download for analysis. It has a progress store of its own and
 * is not registered with the player's abortable downloads, so the mini-player
 * shows no loading state for it and resetting the player does not cancel it.
 */
export const downloadAudioForPeaks = async (
  request: PeakPrefetchRequest,
): Promise<Blob | null> => {
  try {
    return await downloadSavedTrackBlob(
      { ...request, signal: new AbortController().signal },
      {
        clearTimer: (handle) => {
          clearTimeout(handle as ReturnType<typeof setTimeout>);
        },
        fetch: globalThis.fetch.bind(globalThis),
        now: () => Date.now(),
        setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
        store: createSavedTrackDownloadProgressStore(),
      },
    );
  } catch {
    // The waveform stays a placeholder; playback is unaffected.
    return null;
  }
};
