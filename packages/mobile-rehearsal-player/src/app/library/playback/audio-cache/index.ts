import { WEB_AUDIO_CACHE_BUDGET_BYTES } from './audio-cache-budget';
import { audioStore } from './audio-store';
import { createPersistentAudioCache } from './persistent-audio-cache';

export type { PersistentAudioCache } from './persistent-audio-cache';

export const persistentAudioCache = createPersistentAudioCache({
  budgetBytes: WEB_AUDIO_CACHE_BUDGET_BYTES,
  store: audioStore,
});
