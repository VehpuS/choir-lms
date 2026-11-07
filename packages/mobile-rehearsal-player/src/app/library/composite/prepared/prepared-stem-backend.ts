import type { PreparedStemsBackend } from './prepared-stem-types';

/** Native has no prepared stems: composites are web only for now (composite-tracks non-goals). */
export const createIndexedDbPreparedStemsBackend =
  (): PreparedStemsBackend | null => null;
