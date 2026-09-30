import type {
  WaveformPeakEntry,
  WaveformPeakRecord,
  WaveformPeakStore,
} from './peak-store-types';

const DATABASE_NAME = 'choirlms-waveform-peaks';
const DATABASE_VERSION = 1;
const RECORD_STORE = 'records';
const ENTRY_STORE = 'entries';

/**
 * IndexedDB holds hundreds of megabytes where `localStorage` holds about
 * five, which matters at up to 120 KB of peaks per long track.
 */
export const WAVEFORM_PEAK_BUDGET_BYTES = 64 * 1024 * 1024;

// The app's TypeScript config carries no DOM library, so the slice of the
// IndexedDB API used here is described structurally.
type IdbRequest<Result> = {
  error: unknown;
  onerror: (() => void) | null;
  onsuccess: (() => void) | null;
  result: Result;
};

type IdbObjectStore = {
  delete: (key: string) => unknown;
  get: (key: string) => IdbRequest<WaveformPeakRecord | undefined>;
  getAll: () => IdbRequest<WaveformPeakEntry[]>;
  put: (value: unknown) => unknown;
};

type IdbTransaction = {
  error: unknown;
  objectStore: (name: string) => IdbObjectStore;
  oncomplete: (() => void) | null;
  onerror: (() => void) | null;
};

type IdbDatabase = {
  createObjectStore: (name: string, options: { keyPath: string }) => unknown;
  transaction: (
    stores: string | string[],
    mode?: 'readonly' | 'readwrite',
  ) => IdbTransaction;
};

type IdbOpenRequest = IdbRequest<IdbDatabase> & {
  onupgradeneeded: (() => void) | null;
};

const getIndexedDb = () => {
  return (
    globalThis as unknown as {
      indexedDB: {
        open: (name: string, version: number) => IdbOpenRequest;
      };
    }
  ).indexedDB;
};

const requestResult = <Result>(request: IdbRequest<Result>) => {
  return new Promise<Result>((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

const openDatabase = () => {
  return new Promise<IdbDatabase>((resolve, reject) => {
    const request = getIndexedDb().open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(RECORD_STORE, { keyPath: 'key' });
      request.result.createObjectStore(ENTRY_STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const createIndexedDbWaveformPeakStore = (): WaveformPeakStore => {
  let databasePromise: Promise<IdbDatabase> | null = null;
  const getDatabase = () => {
    databasePromise ??= openDatabase();

    return databasePromise;
  };

  return {
    async get(key) {
      const database = await getDatabase();
      const record = await requestResult(
        database.transaction(RECORD_STORE).objectStore(RECORD_STORE).get(key),
      );

      return record ?? null;
    },
    async list() {
      const database = await getDatabase();

      return requestResult(
        database.transaction(ENTRY_STORE).objectStore(ENTRY_STORE).getAll(),
      );
    },
    async put(record) {
      const database = await getDatabase();
      const transaction = database.transaction(
        [RECORD_STORE, ENTRY_STORE],
        'readwrite',
      );

      transaction.objectStore(RECORD_STORE).put(record);
      transaction.objectStore(ENTRY_STORE).put({
        key: record.key,
        sizeBytes: record.peaks.buckets.length,
        touchedAt: record.touchedAt,
      } satisfies WaveformPeakEntry);
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => {
          resolve();
        };
        transaction.onerror = () => {
          reject(transaction.error);
        };
      });
    },
    async remove(key) {
      const database = await getDatabase();
      const transaction = database.transaction(
        [RECORD_STORE, ENTRY_STORE],
        'readwrite',
      );

      transaction.objectStore(RECORD_STORE).delete(key);
      transaction.objectStore(ENTRY_STORE).delete(key);
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => {
          resolve();
        };
        transaction.onerror = () => {
          reject(transaction.error);
        };
      });
    },
  };
};

export const waveformPeakStore = createIndexedDbWaveformPeakStore();
