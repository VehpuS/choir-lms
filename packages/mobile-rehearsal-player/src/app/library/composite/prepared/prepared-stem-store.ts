import {
  createWavWindowReader,
  encodeWavHeader,
  int16ToBytes,
} from '@org/audio-mixing';

import {
  PreparedStemsUnavailableError,
  type PreparedStemKey,
  type PreparedStemsBackend,
  type PreparedStemStore,
  type PreparedStemWriter,
  type StoredPreparedStem,
} from './prepared-stem-types';

const MONO = 1;
const BYTES_PER_SAMPLE = 2;
const WAV_MIME_TYPE = 'audio/wav';
const KEY_PART_SEPARATOR = ':';

/** Parts joined into a key; each is encoded so ids with a separator cannot collide. */
export const preparedStemId = (key: PreparedStemKey): string =>
  [key.compositeId, key.stemId]
    .map(encodeURIComponent)
    .join(KEY_PART_SEPARATOR);

/** The WAV for a stem: a header, then the chunk blobs joined by reference. */
const wavBlobOf = (record: StoredPreparedStem, chunks: Blob[]): Blob => {
  const header = encodeWavHeader(
    { sampleRate: record.sampleRate, channels: MONO },
    record.sampleCount,
  );

  return new Blob([header as unknown as Blob, ...chunks], {
    type: WAV_MIME_TYPE,
  } as never);
};

const isReadable = (
  record: StoredPreparedStem | undefined,
  key: PreparedStemKey,
): record is StoredPreparedStem =>
  record !== undefined &&
  record.status === 'complete' &&
  record.contentVersion === key.contentVersion;

/**
 * Prepared stems (composite-tracks design Decision 9): each stem is stored as
 * mono 16-bit PCM in chunks, written one stem at a time and read back through
 * the window reader, so playback never holds more than a few windows per stem.
 * They are a cache: anything here can be rebuilt from the stems' tracks.
 */
export const createPreparedStemStore = (
  backend: PreparedStemsBackend,
): PreparedStemStore => {
  const begin: PreparedStemStore['begin'] = async (key, format) => {
    const id = preparedStemId(key);

    // Replace, never extend: an older version or an interrupted write is gone first.
    await backend.deleteStem(id);

    let record: StoredPreparedStem = {
      ...key,
      id,
      status: 'writing',
      sampleRate: format.sampleRate,
      chunkCount: 0,
      sampleCount: 0,
      sizeBytes: 0,
    };

    await backend.putRecord(record);

    const writer: PreparedStemWriter = {
      write: async (samples) => {
        const sampleCount = record.sampleCount + samples.length;
        const next = {
          ...record,
          chunkCount: record.chunkCount + 1,
          sampleCount,
          sizeBytes: sampleCount * BYTES_PER_SAMPLE,
        };

        // Atomic: on a failure neither the chunk nor the new counts are stored,
        // and `record` still describes what is stored.
        await backend.appendChunk(
          next,
          record.chunkCount,
          new Blob([int16ToBytes(samples) as unknown as Blob]),
        );
        record = next;
      },
      finish: async (peaks) => {
        record = {
          ...record,
          status: 'complete',
          ...(peaks ? { peaks } : {}),
        };
        await backend.putRecord(record);
      },
      abort: () => backend.deleteStem(id),
    };

    return writer;
  };

  const find = async (key: PreparedStemKey) => {
    const record = await backend.getRecord(preparedStemId(key));

    return isReadable(record, key) ? record : null;
  };

  return {
    begin,
    open: async (key) => {
      const record = await find(key);

      if (!record) {
        return null;
      }

      return createWavWindowReader(
        wavBlobOf(record, await backend.getChunks(record.id)),
      );
    },
    has: async (key) => (await find(key)) !== null,
    getPeaks: async (key) => (await find(key))?.peaks ?? null,
    sizeBytes: async () => {
      const records = await backend.listRecords();

      return records.reduce((sum, record) => sum + record.sizeBytes, 0);
    },
    sizeBytesOfComposite: async (compositeId) => {
      const records = await backend.listRecords();

      return records
        .filter((record) => record.compositeId === compositeId)
        .reduce((sum, record) => sum + record.sizeBytes, 0);
    },
    deleteComposite: async (compositeId) => {
      const records = await backend.listRecords();

      for (const record of records) {
        if (record.compositeId === compositeId) {
          await backend.deleteStem(record.id);
        }
      }
    },
    deleteAll: async () => {
      const records = await backend.listRecords();

      for (const record of records) {
        await backend.deleteStem(record.id);
      }
    },
  };
};

/** The store where composites cannot play: reads are empty, writes say why. */
export const createUnavailablePreparedStemStore = (): PreparedStemStore => ({
  begin: () => Promise.reject(new PreparedStemsUnavailableError()),
  open: async () => null,
  has: async () => false,
  getPeaks: async () => null,
  sizeBytes: async () => 0,
  sizeBytesOfComposite: async () => 0,
  deleteComposite: async () => undefined,
  deleteAll: async () => undefined,
});
