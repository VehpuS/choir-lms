import type { BrowserContext } from 'playwright';

import type { MockStoredRecording } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';

// The app keeps recordings in IndexedDB (database `choirlms-recordings`: a
// `recordings` store keyed by `id` and a `recording-audio` store keyed by
// `key`), not in localStorage like the rest of the library. This writes the
// records before the app opens the database, once per browser profile (a flag
// in localStorage stops a reload bringing a deleted recording back). Records
// only: a seeded recording lists and opens but has no audio chunks.
const DATABASE_NAME = 'choirlms-recordings';
const DATABASE_VERSION = 1;
const SEEDED_FLAG = 'mock-recordings-seeded';

/** The page-side script, as a plain string (see `audio-output-tap.ts`). */
const buildSeedScript = (records: MockStoredRecording[]) => `
(() => {
  if (window.localStorage.getItem(${JSON.stringify(SEEDED_FLAG)})) {
    return;
  }

  const open = indexedDB.open(${JSON.stringify(DATABASE_NAME)}, ${DATABASE_VERSION});

  open.onupgradeneeded = () => {
    open.result.createObjectStore('recordings', { keyPath: 'id' });
    open.result.createObjectStore('recording-audio', { keyPath: 'key' });
  };
  open.onsuccess = () => {
    const transaction = open.result.transaction('recordings', 'readwrite');

    for (const record of ${JSON.stringify(records)}) {
      transaction.objectStore('recordings').put(record);
    }

    transaction.oncomplete = () => {
      open.result.close();
      window.localStorage.setItem(${JSON.stringify(SEEDED_FLAG)}, '1');
    };
  };
})();
`;

export const seedMockRecordings = async (
  context: BrowserContext,
  records: MockStoredRecording[],
) => {
  await context.addInitScript(buildSeedScript(records));
};
