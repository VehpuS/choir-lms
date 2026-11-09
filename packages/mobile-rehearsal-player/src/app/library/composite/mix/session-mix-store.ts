import { useSyncExternalStore } from 'react';

import type { CompositeTrack } from '@org/audio-library-models';
import {
  pruneMixToStems,
  reduceSessionMix,
  startSessionMix,
  type SessionMix,
  type SessionMixAction,
} from '@org/audio-mixing';

/**
 * The mix the listener has now (composite-tracks design Decision 7). It starts
 * from the composite's saved default when a composite first plays and resets
 * when another one does; the Mix panel and the engine both read it.
 */

type StoreComposite = Pick<CompositeTrack, 'id' | 'stems' | 'defaultMix'>;

export type SessionMixStore = {
  /** The session for this composite; a different composite starts a new one. */
  get: (composite: StoreComposite) => SessionMix;
  dispatch: (composite: StoreComposite, action: SessionMixAction) => void;
  subscribe: (listener: () => void) => () => void;
};

export const createSessionMixStore = (): SessionMixStore => {
  const listeners = new Set<() => void>();
  let current: { compositeId: string; session: SessionMix } | null = null;

  const get: SessionMixStore['get'] = (composite) => {
    if (current?.compositeId === composite.id) {
      return current.session;
    }

    // Kept, so the snapshot is stable between reads.
    current = {
      compositeId: composite.id,
      session: startSessionMix(composite),
    };

    return current.session;
  };

  return {
    get,
    dispatch: (composite, action) => {
      const before = get(composite);
      const after = reduceSessionMix(before, action);

      current = {
        compositeId: composite.id,
        // A stem removed since the session began no longer counts.
        session: { ...after, mix: pruneMixToStems(composite.stems, after.mix) },
      };
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

const store = createSessionMixStore();

export const dispatchSessionMix = (
  composite: StoreComposite,
  action: SessionMixAction,
): void => {
  store.dispatch(composite, action);
};

export const useSessionMix = (composite: StoreComposite): SessionMix =>
  useSyncExternalStore(
    store.subscribe,
    () => store.get(composite),
    () => store.get(composite),
  );
