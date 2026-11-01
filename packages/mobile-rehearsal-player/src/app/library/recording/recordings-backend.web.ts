import type {
  RecordingsBackend,
  StoredRecording,
} from './recordings-store-types';

const DATABASE_NAME = 'choirlms-recordings';
const DATABASE_VERSION = 1;
const RECORD_STORE = 'recordings';
const AUDIO_STORE = 'recording-audio';
const CHUNK_INDEX_WIDTH = 8;
const KEY_SEPARATOR = ':';
/** Sorts after every character an index can contain, closing a recording's key range. */
const KEY_RANGE_END = '￿';

// The app's TypeScript config carries no DOM library, so the slice of the
// IndexedDB API used here is described structurally (as the other stores do).
type IdbRequest<Result> = {
  error: unknown;
  onerror: (() => void) | null;
  onsuccess: (() => void) | null;
  result: Result;
};

type IdbKeyRange = unknown;

type IdbObjectStore = {
  delete: (key: string | IdbKeyRange) => unknown;
  get: (key: string) => IdbRequest<unknown>;
  getAll: (range?: IdbKeyRange) => IdbRequest<unknown[]>;
  put: (value: unknown) => unknown;
};

type IdbTransaction = {
  error: unknown;
  objectStore: (name: string) => IdbObjectStore;
  onabort: (() => void) | null;
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

type BrowserIdb = {
  indexedDB: { open: (name: string, version: number) => IdbOpenRequest };
  IDBKeyRange: { bound: (lower: string, upper: string) => IdbKeyRange };
};

type StoredChunk = { key: string; blob: Blob };

const browser = () => globalThis as unknown as BrowserIdb;

const chunkKey = (id: string, index: number) =>
  `${id}${KEY_SEPARATOR}${String(index).padStart(CHUNK_INDEX_WIDTH, '0')}`;

const chunkRange = (id: string) =>
  browser().IDBKeyRange.bound(
    `${id}${KEY_SEPARATOR}`,
    `${id}${KEY_SEPARATOR}${KEY_RANGE_END}`,
  );

const requestResult = <Result>(request: IdbRequest<Result>) =>
  new Promise<Result>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** Resolves when the transaction commits; rejects if it errors or aborts. */
const committed = (transaction: IdbTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

const openDatabase = () =>
  new Promise<IdbDatabase>((resolve, reject) => {
    const request = browser().indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(RECORD_STORE, { keyPath: 'id' });
      request.result.createObjectStore(AUDIO_STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** IndexedDB behind the recordings store: its own database, never the track cache. */
export const createIndexedDbRecordingsBackend = (): RecordingsBackend => {
  let databasePromise: Promise<IdbDatabase> | null = null;
  const getDatabase = () => (databasePromise ??= openDatabase());

  return {
    putRecord: async (record) => {
      const transaction = (await getDatabase()).transaction(
        RECORD_STORE,
        'readwrite',
      );

      transaction.objectStore(RECORD_STORE).put(record);
      await committed(transaction);
    },
    getRecord: async (id) => {
      const database = await getDatabase();
      const record = await requestResult(
        database.transaction(RECORD_STORE).objectStore(RECORD_STORE).get(id),
      );

      return record as StoredRecording | undefined;
    },
    listRecords: async () => {
      const database = await getDatabase();

      return (await requestResult(
        database.transaction(RECORD_STORE).objectStore(RECORD_STORE).getAll(),
      )) as StoredRecording[];
    },
    appendChunk: async (record, index, chunk) => {
      const transaction = (await getDatabase()).transaction(
        [RECORD_STORE, AUDIO_STORE],
        'readwrite',
      );

      // One transaction: the chunk and the record's checkpoint land together
      // or not at all, so a retried append can never leave a duplicate.
      transaction.objectStore(AUDIO_STORE).put({
        key: chunkKey(record.id, index),
        blob: chunk,
      } satisfies StoredChunk);
      transaction.objectStore(RECORD_STORE).put(record);
      await committed(transaction);
    },
    getChunks: async (id) => {
      const database = await getDatabase();
      const chunks = (await requestResult(
        database
          .transaction(AUDIO_STORE)
          .objectStore(AUDIO_STORE)
          .getAll(chunkRange(id)),
      )) as StoredChunk[];

      return chunks.map((chunk) => chunk.blob);
    },
    deleteRecording: async (id) => {
      const transaction = (await getDatabase()).transaction(
        [RECORD_STORE, AUDIO_STORE],
        'readwrite',
      );

      transaction.objectStore(RECORD_STORE).delete(id);
      transaction.objectStore(AUDIO_STORE).delete(chunkRange(id));
      await committed(transaction);
    },
  };
};
