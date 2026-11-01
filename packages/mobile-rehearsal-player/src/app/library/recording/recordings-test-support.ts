import assert from 'node:assert/strict';

import { decodeWav } from '@org/audio-mixing';

import type {
  RecordingsBackend,
  RecordingsStore,
  StoredRecording,
} from './recordings-store-types';

/**
 * An in-memory `RecordingsBackend` with the same atomicity as the IndexedDB
 * one: an append that fails writes neither the chunk nor the record.
 */
export const createMemoryRecordingsBackend = () => {
  const records = new Map<string, StoredRecording>();
  const chunks = new Map<string, Blob[]>();
  let failAppends = 0;

  const backend: RecordingsBackend = {
    putRecord: async (record) => {
      records.set(record.id, structuredClone(record));
    },
    getRecord: async (id) => {
      const record = records.get(id);

      return record ? structuredClone(record) : undefined;
    },
    listRecords: async () =>
      [...records.values()].map((r) => structuredClone(r)),
    appendChunk: async (record, index, chunk) => {
      if (failAppends > 0) {
        failAppends -= 1;
        throw new Error('QuotaExceededError');
      }

      const list = chunks.get(record.id) ?? [];

      list[index] = chunk;
      chunks.set(record.id, list);
      records.set(record.id, structuredClone(record));
    },
    getChunks: async (id) => [...(chunks.get(id) ?? [])],
    deleteRecording: async (id) => {
      records.delete(id);
      chunks.delete(id);
    },
  };

  return {
    backend,
    /** The next `count` appends reject without writing anything. */
    failNextAppends: (count: number) => {
      failAppends = count;
    },
    chunkCount: (id: string) => chunks.get(id)?.length ?? 0,
    recordIds: () => [...records.keys()],
  };
};

/** The samples of a stored recording, read back through its assembled WAV. */
export const readStoredSamples = async (
  store: RecordingsStore,
  id: string,
): Promise<number[]> => {
  const blob = await store.getWavBlob(id);

  assert.ok(blob, `recording ${id} has no audio`);

  const decoded = decodeWav(new Uint8Array(await blob.arrayBuffer()));

  assert.ok(decoded.ok, 'the assembled WAV decodes');

  return [...decoded.wav.samples];
};
