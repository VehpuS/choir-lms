import { omit } from 'es-toolkit';
import { encodeWavHeader, int16ToBytes } from '@org/audio-mixing';
import {
  getRecordingOwner,
  type Recording,
  type RecordingOwner,
} from '@org/audio-library-models';

import {
  RecordingsUnavailableError,
  type RecordingCheckpoint,
  type RecordingsBackend,
  type RecordingsStore,
  type StoredRecording,
} from './recordings-store-types';

const BYTES_PER_SAMPLE = 2;
const MONO = 1;
const WAV_MIME_TYPE = 'audio/wav';

const stripStorage = (stored: StoredRecording): Recording =>
  omit(stored, ['chunkCount', 'sampleCount', 'status']);

/**
 * `Blob` accepts bytes at runtime in every browser; the app's types (the RN
 * flavour, with no DOM lib) only list `string | Blob`, so bytes are cast, as
 * the saved-track download and the kept-score reader do.
 */
const blobOfParts = (
  bytes: Uint8Array[],
  type?: string,
  blobs: Blob[] = [],
): Blob => {
  return new Blob(
    [...(bytes as unknown as Blob[]), ...blobs],
    (type ? { type } : undefined) as never,
  );
};

const byNewest = (a: Recording, b: Recording) =>
  a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;

const sameOwner = (recording: Recording, owner: RecordingOwner) => {
  const own = getRecordingOwner(recording);

  return own.kind === owner.kind && own.id === owner.id;
};

/**
 * The recordings store (rehearsal-recording design Decision 4). Nothing here
 * evicts or expires anything: a recording leaves only through `delete`.
 * `requestPersistence` asks the browser not to clear site data; it is called
 * once, when the first recording completes.
 */
export const createRecordingsStore = (
  backend: RecordingsBackend,
  options: { requestPersistence?: () => Promise<unknown> } = {},
): RecordingsStore => {
  let persistenceRequested = false;

  const requireRecord = async (id: string) => {
    const record = await backend.getRecord(id);

    if (!record) {
      throw new Error(`Recording ${id} does not exist`);
    }

    return record;
  };

  const listWhere = async (status: StoredRecording['status']) => {
    const records = await backend.listRecords();

    return records.filter((r) => r.status === status).map(stripStorage);
  };

  return {
    create: (recording) =>
      backend.putRecord({
        ...recording,
        status: 'recording',
        chunkCount: 0,
        sampleCount: 0,
      }),
    appendChunk: async (id, chunk, checkpoint: RecordingCheckpoint) => {
      const record = await requireRecord(id);
      const sampleCount = record.sampleCount + chunk.length;

      await backend.appendChunk(
        {
          ...record,
          ...checkpoint,
          sampleCount,
          sizeBytes: sampleCount * BYTES_PER_SAMPLE,
          chunkCount: record.chunkCount + 1,
        },
        record.chunkCount,
        blobOfParts([int16ToBytes(chunk)]),
      );
    },
    complete: async (recording) => {
      const record = await requireRecord(recording.id);

      await backend.putRecord({
        ...recording,
        status: 'complete',
        chunkCount: record.chunkCount,
        sampleCount: record.sampleCount,
      });

      if (!persistenceRequested) {
        persistenceRequested = true;
        await Promise.resolve(options.requestPersistence?.()).catch(
          () => undefined,
        );
      }
    },
    get: async (id) => {
      const record = await backend.getRecord(id);

      return record?.status === 'complete' ? stripStorage(record) : null;
    },
    list: async () => (await listWhere('complete')).sort(byNewest),
    listByOwner: async (owner) =>
      (await listWhere('complete'))
        .filter((recording) => sameOwner(recording, owner))
        .sort(byNewest),
    listIncomplete: () => listWhere('recording'),
    update: async (id, patch) => {
      const record = await requireRecord(id);

      await backend.putRecord({ ...record, ...patch });
    },
    getWavBlob: async (id) => {
      const record = await backend.getRecord(id);

      if (!record) {
        return null;
      }

      const header = encodeWavHeader(
        { sampleRate: record.sampleRate, channels: MONO },
        record.sampleCount,
      );

      // The chunk blobs are joined by reference, not read into memory.
      const chunks = await backend.getChunks(id);

      return blobOfParts([header], WAV_MIME_TYPE, chunks);
    },
    delete: (id) => backend.deleteRecording(id),
    totalSizeBytes: async () => {
      const records = await backend.listRecords();

      return records.reduce((sum, record) => sum + record.sizeBytes, 0);
    },
  };
};

/** The store where recording is not possible: reads are empty, writes say why. */
export const createUnavailableRecordingsStore = (): RecordingsStore => {
  const reject = () => Promise.reject(new RecordingsUnavailableError());

  return {
    create: reject,
    appendChunk: reject,
    complete: reject,
    get: async () => null,
    list: async () => [],
    listByOwner: async () => [],
    listIncomplete: async () => [],
    update: reject,
    getWavBlob: async () => null,
    delete: reject,
    totalSizeBytes: async () => 0,
  };
};
