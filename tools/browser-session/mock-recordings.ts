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

export type RecordedAudio = {
  /** The record as the app stored it. */
  record: {
    durationMs: number;
    id: string;
    name: string;
    sampleCount: number;
    sampleRate: number;
    status: string;
  };
  /** The audio the app saved for it, as mono samples in -1 to 1. */
  samples: Float32Array;
};

/** The page-side reader, as a plain string (see `audio-output-tap.ts`). */
const READ_SCRIPT = `(async () => {
  const open = indexedDB.open(${JSON.stringify(DATABASE_NAME)});
  const db = await new Promise((resolve) => { open.onsuccess = () => resolve(open.result); });
  const all = (name) => new Promise((resolve) => {
    const request = db.transaction(name).objectStore(name).getAll();
    request.onsuccess = () => resolve(request.result);
  });
  const records = await all('recordings');
  const chunks = (await all('recording-audio')).sort((a, b) => (a.key < b.key ? -1 : 1));
  const out = [];

  for (const record of records) {
    const mine = chunks.filter((chunk) => chunk.key.startsWith(record.id + ':'));
    const samples = [];

    for (const chunk of mine) {
      const view = new Int16Array(await chunk.blob.arrayBuffer());

      for (let index = 0; index < view.length; index += 1) {
        samples.push(view[index] / 32768);
      }
    }

    out.push({
      record: {
        durationMs: record.durationMs, id: record.id, name: record.name,
        sampleCount: record.sampleCount, sampleRate: record.sampleRate, status: record.status,
      },
      samples,
    });
  }

  db.close();

  return out;
})()`;

/**
 * Every recording the app has stored, with its real audio read back from the
 * app's IndexedDB (16-bit chunks, as the recorder wrote them).
 */
export const readRecordedAudio = async (
  page: import('playwright').Page,
): Promise<RecordedAudio[]> => {
  const stored = (await page.evaluate(READ_SCRIPT)) as {
    record: RecordedAudio['record'];
    samples: number[];
  }[];

  return stored.map(({ record, samples }) => ({
    record,
    samples: Float32Array.from(samples),
  }));
};
