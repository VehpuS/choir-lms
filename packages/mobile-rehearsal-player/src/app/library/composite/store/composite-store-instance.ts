import {
  listStoredComposites,
  updateStoredComposites,
} from '@org/audio-library-runtime';
import { useEffect, useSyncExternalStore } from 'react';
import type { CompositeTrack } from '@org/audio-library-models';

import { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import { placeNewComposite } from './place-new-composite';
import { getPreparedStemStore } from '../prepared/prepared-stem-instance';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../storage/local-library-storage';
import { createCompositeStore, type CompositeStore } from './composite-store';

let instance: CompositeStore | null = null;
let hasRequestedFirstRead = false;

/** The app's one composite store, over the local library's `composites` collection. */
export const getCompositeStore = (): CompositeStore => {
  if (!instance) {
    instance = createCompositeStore({
      storage: {
        list: () => listStoredComposites(LOCAL_REHEARSAL_LIBRARY_OWNER_ID),
        update: (change) =>
          updateStoredComposites(LOCAL_REHEARSAL_LIBRARY_OWNER_ID, change),
      },
      onCreated: (composite) =>
        placeNewComposite({
          composite,
          ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          repository: new AsyncStoragePracticeRepository(),
        }),
      // Prepared stems are a cache of this composite; they go with it.
      onDeleted: (compositeId) => {
        void getPreparedStemStore()
          .deleteComposite(compositeId)
          .catch(() => undefined);
      },
    });
  }

  return instance;
};

/** The composites as of the last change; reads storage once on first use. */
export const getCompositesSnapshot = (): readonly CompositeTrack[] => {
  const store = getCompositeStore();

  if (!hasRequestedFirstRead) {
    hasRequestedFirstRead = true;
    void store.refresh().catch(() => undefined);
  }

  return store.getSnapshot();
};

export const useComposites = (): readonly CompositeTrack[] => {
  const store = getCompositeStore();

  useEffect(() => {
    getCompositesSnapshot();
  }, []);

  return useSyncExternalStore(store.subscribe, store.getSnapshot);
};
