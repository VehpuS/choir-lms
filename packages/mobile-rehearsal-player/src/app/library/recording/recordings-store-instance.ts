import { createIndexedDbRecordingsBackend } from './recordings-backend';
import {
  createRecordingsStore,
  createUnavailableRecordingsStore,
} from './recordings-store';
import type { RecordingsStore } from './recordings-store-types';

type StorageManager = { persist?: () => Promise<boolean> };

const requestPersistentStorage = async () => {
  const storage = (globalThis as { navigator?: { storage?: StorageManager } })
    .navigator?.storage;

  return storage?.persist ? storage.persist() : false;
};

let instance: RecordingsStore | null = null;

/** The app's one recordings store; an unavailable one where recording is not possible. */
export const getRecordingsStore = (): RecordingsStore => {
  if (!instance) {
    const backend = createIndexedDbRecordingsBackend();

    instance = backend
      ? createRecordingsStore(backend, {
          requestPersistence: requestPersistentStorage,
        })
      : createUnavailableRecordingsStore();
  }

  return instance;
};
