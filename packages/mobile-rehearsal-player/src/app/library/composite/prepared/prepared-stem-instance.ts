import { createIndexedDbPreparedStemsBackend } from './prepared-stem-backend';
import {
  createPreparedStemStore,
  createUnavailablePreparedStemStore,
} from './prepared-stem-store';
import type { PreparedStemStore } from './prepared-stem-types';

let instance: PreparedStemStore | null = null;

/** The app's one prepared-stem store; an unavailable one where composites cannot play. */
export const getPreparedStemStore = (): PreparedStemStore => {
  if (!instance) {
    const backend = createIndexedDbPreparedStemsBackend();

    instance = backend
      ? createPreparedStemStore(backend)
      : createUnavailablePreparedStemStore();
  }

  return instance;
};
