import type {
  PreparedStemsBackend,
  StoredPreparedStem,
} from './prepared-stem-types';

/**
 * An in-memory `PreparedStemsBackend` with the same atomicity as the IndexedDB
 * one: an append that fails writes neither the chunk nor the record.
 */
export const createMemoryPreparedStemsBackend = () => {
  const records = new Map<string, StoredPreparedStem>();
  const chunks = new Map<string, Blob[]>();
  let failAppends = 0;

  const backend: PreparedStemsBackend = {
    putRecord: async (record) => {
      records.set(record.id, structuredClone(record));
    },
    getRecord: async (id) => {
      const record = records.get(id);

      return record ? structuredClone(record) : undefined;
    },
    listRecords: async () =>
      [...records.values()].map((record) => structuredClone(record)),
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
    deleteStem: async (id) => {
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
