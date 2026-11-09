import { useSyncExternalStore } from 'react';

import type { StemLoadProgress } from './composite-stem-loader';

/**
 * What the playback screen shows while a composite loads (composite-tracks
 * design Decisions 9 and 10): per-stem progress, and whether this is the first
 * time (stems are prepared) or a quick open. One load is current at a time; a
 * newer load replaces it, so a superseded load can neither update nor clear the
 * state that now belongs to the newer one.
 */

export type CompositeLoadPhase = 'loading' | 'preparing';

export type CompositeLoadState = {
  compositeId: string;
  phase: CompositeLoadPhase;
  stems: readonly StemLoadProgress[];
};

export type CompositeLoadHandle = {
  update: (stems: readonly StemLoadProgress[]) => void;
  /** Clears the state if this load is still the current one. */
  end: () => void;
};

export type CompositeLoadStore = {
  begin: (
    compositeId: string,
    stemIds: readonly string[],
    phase: CompositeLoadPhase,
  ) => CompositeLoadHandle;
  get: () => CompositeLoadState | null;
  subscribe: (listener: () => void) => () => void;
};

export const createCompositeLoadStore = (): CompositeLoadStore => {
  const listeners = new Set<() => void>();
  let current: CompositeLoadState | null = null;
  let currentToken = 0;

  const publish = (next: CompositeLoadState | null) => {
    current = next;
    listeners.forEach((listener) => listener());
  };

  return {
    begin: (compositeId, stemIds, phase) => {
      currentToken += 1;
      const token = currentToken;

      publish({
        compositeId,
        phase,
        stems: stemIds.map((stemId) => ({
          stemId,
          status: 'waiting',
          fraction: 0,
        })),
      });

      return {
        update: (stems) => {
          if (token === currentToken && current) {
            publish({ ...current, stems });
          }
        },
        end: () => {
          if (token === currentToken) {
            publish(null);
          }
        },
      };
    },
    get: () => current,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

const store = createCompositeLoadStore();

export const getCompositeLoadStore = (): CompositeLoadStore => store;

/** The load in progress, or null when no composite is loading. */
export const useCompositeLoadState = (): CompositeLoadState | null =>
  useSyncExternalStore(store.subscribe, store.get, store.get);
