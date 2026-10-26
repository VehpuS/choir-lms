import type {
  AudioStore,
  AudioStoreEntry,
  AudioStoreRecord,
} from './audio-store-types';

const DATABASE_NAME = 'choirlms-audio-cache';
const DATABASE_VERSION = 1;
const BLOB_STORE = 'blobs';
const ENTRY_STORE = 'entries';
const KEY_PATH = 'driveFileId';

// The app's TypeScript config carries no DOM library, so the slice of the
// IndexedDB API used here is described structurally.
type IdbRequest<Result> = {
  error: unknown;
  onerror: (() => void) | null;
  onsuccess: (() => void) | null;
  result: Result;
};

type IdbObjectStore = {
  clear: () => unknown;
  delete: (key: string) => unknown;
  get: (key: string) => IdbRequest<unknown>;
  getAll: () => IdbRequest<unknown[]>;
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

type StoredBlob = { blob: Blob; driveFileId: string };

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

const transactionDone = (transaction: IdbTransaction) => {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

const openDatabase = () => {
  return new Promise<IdbDatabase>((resolve, reject) => {
    const request = getIndexedDb().open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(BLOB_STORE, { keyPath: KEY_PATH });
      request.result.createObjectStore(ENTRY_STORE, { keyPath: KEY_PATH });
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * IndexedDB stores blobs natively and holds far more than `localStorage`.
 * Bytes and their small entries live in separate stores so the budget can be
 * checked and files listed without reading any audio.
 */
export const createIndexedDbAudioStore = (): AudioStore => {
  let databasePromise: Promise<IdbDatabase> | null = null;
  const getDatabase = () => {
    databasePromise ??= openDatabase();

    return databasePromise;
  };

  // Rewrites one small entry record, never the audio bytes.
  const updateEntry = async (
    driveFileId: string,
    change: (entry: AudioStoreEntry) => AudioStoreEntry,
  ) => {
    const database = await getDatabase();
    const transaction = database.transaction(ENTRY_STORE, 'readwrite');
    const entries = transaction.objectStore(ENTRY_STORE);
    const entry = (await requestResult(entries.get(driveFileId))) as
      | AudioStoreEntry
      | undefined;

    if (entry) {
      entries.put(change(entry));
    }

    await transactionDone(transaction);
  };

  return {
    async clear() {
      const database = await getDatabase();
      const transaction = database.transaction(
        [BLOB_STORE, ENTRY_STORE],
        'readwrite',
      );

      transaction.objectStore(BLOB_STORE).clear();
      transaction.objectStore(ENTRY_STORE).clear();
      await transactionDone(transaction);
    },
    async list() {
      const database = await getDatabase();

      return (await requestResult(
        database.transaction(ENTRY_STORE).objectStore(ENTRY_STORE).getAll(),
      )) as AudioStoreEntry[];
    },
    async read(driveFileId) {
      const database = await getDatabase();
      const transaction = database.transaction([ENTRY_STORE, BLOB_STORE]);
      const [entry, stored] = await Promise.all([
        requestResult(transaction.objectStore(ENTRY_STORE).get(driveFileId)),
        requestResult(transaction.objectStore(BLOB_STORE).get(driveFileId)),
      ]);

      if (!entry || !stored) {
        return null;
      }

      return {
        blob: (stored as StoredBlob).blob,
        entry: entry as AudioStoreEntry,
      } satisfies AudioStoreRecord;
    },
    async remove(driveFileId) {
      const database = await getDatabase();
      const transaction = database.transaction(
        [BLOB_STORE, ENTRY_STORE],
        'readwrite',
      );

      transaction.objectStore(BLOB_STORE).delete(driveFileId);
      transaction.objectStore(ENTRY_STORE).delete(driveFileId);
      await transactionDone(transaction);
    },
    async setPinned(driveFileId, pinned) {
      await updateEntry(driveFileId, (entry) => ({ ...entry, pinned }));
    },
    async touch(driveFileId, touchedAt) {
      await updateEntry(driveFileId, (entry) => ({ ...entry, touchedAt }));
    },
    async write(entry, blob) {
      const database = await getDatabase();
      const transaction = database.transaction(
        [BLOB_STORE, ENTRY_STORE],
        'readwrite',
      );

      transaction
        .objectStore(BLOB_STORE)
        .put({ blob, driveFileId: entry.driveFileId } satisfies StoredBlob);
      transaction.objectStore(ENTRY_STORE).put(entry);
      await transactionDone(transaction);
    },
  };
};

export const audioStore = createIndexedDbAudioStore();
