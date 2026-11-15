import { useSyncExternalStore } from 'react';

import {
  createCompositeLoadStore,
  type CompositeLoadPhase,
  type CompositeLoadStore,
} from '../../composite/loading/composite-load-state';
import { getOverallLoadFraction } from '../../composite/loading/composite-stem-loader';

/**
 * What the player shows while a single track is loaded onto the engine
 * (clear-playback-while-listening design Decision 4): whether it is being
 * prepared for the first time or only opened, and how far along it is. It is
 * the composite load store with one stem, kept apart from the composites' own
 * so the Mix panel never takes a track's load for a composite's.
 */

export type ListeningLoadState = {
  trackId: string;
  phase: CompositeLoadPhase;
  /** 0 to 1. */
  fraction: number;
};

const store = createCompositeLoadStore();

export const getListeningLoadStore = (): CompositeLoadStore => store;

export const toListeningLoadState = (
  loadStore: CompositeLoadStore,
): ListeningLoadState | null => {
  const state = loadStore.get();

  return state
    ? {
        trackId: state.compositeId,
        phase: state.phase,
        fraction: getOverallLoadFraction(state.stems),
      }
    : null;
};

// The snapshot must keep its identity between store changes.
let snapshot: ListeningLoadState | null = null;

store.subscribe(() => {
  snapshot = toListeningLoadState(store);
});

const getSnapshot = () => snapshot;

/** The single-track load in progress, or null when none is. */
export const useListeningLoadState = (): ListeningLoadState | null =>
  useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
