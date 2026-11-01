import type { RecordingsBackend } from './recordings-store-types';

/** Native has no recordings store yet (rehearsal-recording non-goals). */
export const createIndexedDbRecordingsBackend = (): RecordingsBackend | null =>
  null;
