import type {
  AudioStore,
  AudioStoreEntry,
  AudioStoreRecord,
} from './audio-store-types';

/** A real in-memory store: the cache logic is what the tests exercise. */
export const createMemoryAudioStore = () => {
  const records = new Map<string, AudioStoreRecord>();
  const store: AudioStore = {
    async clear() {
      records.clear();
    },
    async list() {
      return [...records.values()].map((record): AudioStoreEntry => {
        return record.entry;
      });
    },
    async read(driveFileId) {
      return records.get(driveFileId) ?? null;
    },
    async remove(driveFileId) {
      records.delete(driveFileId);
    },
    async setPinned(driveFileId, pinned) {
      const record = records.get(driveFileId);

      if (record) {
        records.set(driveFileId, {
          ...record,
          entry: { ...record.entry, pinned },
        });
      }
    },
    async touch(driveFileId, touchedAt) {
      const record = records.get(driveFileId);

      if (record) {
        records.set(driveFileId, {
          ...record,
          entry: { ...record.entry, touchedAt },
        });
      }
    },
    async write(entry, blob) {
      records.set(entry.driveFileId, { blob, entry });
    },
  };

  return { records, store };
};

export const blobOf = (size: number) => new Blob(['x'.repeat(size)]);
