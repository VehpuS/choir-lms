import { createTrackPlayableItem } from '@org/audio-library-models';

import type { DriveAudioSource } from '@org/audio-library-models';
import { persistentAudioCache } from '../playback/audio-cache';
import { createSavedTrackDownloadProgressStore } from '../playback/utils/saved-track-download-progress';
import { savedTrackAudioCache } from '../playback/utils/saved-track-audio-cache';
import { createSavedTrackPlaybackRequest } from '../playback/utils/saved-track-playback-view-model';
import { startSavedTrackDownload } from '../playback/utils/saved-track-web-download';
import {
  createOfflineKeeping,
  type KeepOfflineResult,
} from './offline-keeping';
import { offlineStateStore } from './offline-state';

export const isOfflineStorageSupported = true;

// Like the waveform prefetch, the download has a progress store of its own and
// opts out of reset cancellation: the mini-player shows nothing for it, and
// starting playback elsewhere does not cancel it.
const keeping = createOfflineKeeping({
  cache: persistentAudioCache,
  download: ({ headers, name, url, version }) => {
    return startSavedTrackDownload(
      { headers, url },
      {
        clearTimer: (handle) => {
          clearTimeout(handle as ReturnType<typeof setTimeout>);
        },
        fetch: globalThis.fetch.bind(globalThis),
        now: () => Date.now(),
        setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
        store: createSavedTrackDownloadProgressStore(),
      },
      { cancelOnReset: false, name, version },
    );
  },
  memory: savedTrackAudioCache,
  state: offlineStateStore,
});

export const keepSourceOffline = (
  source: DriveAudioSource,
  accessToken: string,
): Promise<KeepOfflineResult> => {
  const { track } = createSavedTrackPlaybackRequest({
    accessToken,
    playableItem: createTrackPlayableItem(source),
  });

  if (track.sourceVersion === undefined) {
    return Promise.reject(new Error('This file has no Drive version yet.'));
  }

  return keeping.keepOffline({
    driveFileId: source.driveFileId,
    headers: track.headers,
    name: source.name,
    url: track.url,
    version: track.sourceVersion,
  });
};

export const removeSourceOffline = (driveFileId: string): Promise<void> => {
  return keeping.removeFromOffline(driveFileId);
};
