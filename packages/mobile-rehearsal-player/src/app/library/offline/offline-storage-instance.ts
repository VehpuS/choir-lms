import { persistentAudioCache } from '../playback/audio-cache';
import { savedTrackAudioCache } from '../playback/utils/saved-track-audio-cache';
import { createOfflineStorageService } from './offline-storage-service';

/** The one removal service the app shares (the offline files view, sign-out). */
export const offlineStorageService = createOfflineStorageService({
  cache: persistentAudioCache,
  memory: savedTrackAudioCache,
});
