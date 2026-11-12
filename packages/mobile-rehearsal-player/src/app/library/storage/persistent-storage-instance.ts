import { useSyncExternalStore } from 'react';

import {
  createPersistentStorage,
  type StorageManagerLike,
} from './persistent-storage';

/** The app-wide request; offline audio and recordings share its one answer. */
export const persistentStorage = createPersistentStorage(
  () =>
    (globalThis as { navigator?: { storage?: StorageManagerLike } }).navigator
      ?.storage,
);

export const usePersistentStorageStatus = () =>
  useSyncExternalStore(
    persistentStorage.subscribe,
    persistentStorage.getStatus,
    persistentStorage.getStatus,
  );
