import { savedTrackAudioCache } from '../utils/saved-track-audio-cache';
import { audioCacheBudgetStore } from './audio-cache-budget';
import { audioStore } from './audio-store';
import { createPersistentAudioCache } from './persistent-audio-cache';

export type { PersistentAudioCache } from './persistent-audio-cache';

export const persistentAudioCache = createPersistentAudioCache({
  budgetBytes: audioCacheBudgetStore.get,
  store: audioStore,
});

/**
 * Lowering the cache size evicts at once, from the persisted files and the
 * in-memory copies, so the stored total never stays above the chosen size.
 */
audioCacheBudgetStore.subscribe(() => {
  savedTrackAudioCache.enforceBudget();
  void persistentAudioCache.enforceBudget();
});

// The saved size applies from startup; an already-stored cache is trimmed to it.
void audioCacheBudgetStore.restore();
