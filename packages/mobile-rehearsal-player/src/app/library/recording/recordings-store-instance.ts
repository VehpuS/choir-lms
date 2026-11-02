import type { Recording } from '@org/audio-library-models';

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
let snapshot: readonly Recording[] = [];

/**
 * The finished recordings as of the last change, readable synchronously. The
 * playlist queue is built synchronously from the library, so recording entries
 * resolve against this; a playlist start awaits `refreshRecordingsSnapshot`
 * first so it is never behind.
 */
export const getRecordingsSnapshot = (): readonly Recording[] => snapshot;

export const refreshRecordingsSnapshot = async (): Promise<
  readonly Recording[]
> => {
  try {
    snapshot = await getRecordingsStore().list();
  } catch {
    snapshot = [];
  }

  return snapshot;
};

const MUTATIONS = ['create', 'complete', 'update', 'delete'] as const;

/** The store with every change followed by a snapshot refresh. */
const withSnapshotRefresh = (store: RecordingsStore): RecordingsStore => {
  const wrapped = { ...store };

  MUTATIONS.forEach((name) => {
    const original = store[name] as (...args: never[]) => Promise<void>;

    (wrapped[name] as unknown) = async (...args: never[]) => {
      await original(...args);
      await refreshRecordingsSnapshot();
    };
  });

  return wrapped;
};

/** The app's one recordings store; an unavailable one where recording is not possible. */
export const getRecordingsStore = (): RecordingsStore => {
  if (!instance) {
    const backend = createIndexedDbRecordingsBackend();

    instance = withSnapshotRefresh(
      backend
        ? createRecordingsStore(backend, {
            requestPersistence: requestPersistentStorage,
          })
        : createUnavailableRecordingsStore(),
    );
    void refreshRecordingsSnapshot();
  }

  return instance;
};
