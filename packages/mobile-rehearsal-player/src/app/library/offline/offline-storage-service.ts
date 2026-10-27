import type { PersistentAudioCache } from '../playback/audio-cache';

export type OfflineStorageServiceDependencies = {
  cache: Pick<
    PersistentAudioCache,
    'clear' | 'clearAutomatic' | 'list' | 'remove'
  >;
  /** The in-memory copies, dropped with the stored ones so nothing lingers. */
  memory: { clear: () => void; delete: (driveFileId: string) => void };
};

/**
 * Removal for the offline files view: one file, a selection, the automatic
 * cache, or everything. Each clears the in-memory copy too, so a removed file
 * is no longer served from memory for the rest of the session.
 */
export const createOfflineStorageService = ({
  cache,
  memory,
}: OfflineStorageServiceDependencies) => {
  return {
    async clearAll(): Promise<void> {
      memory.clear();
      await cache.clear();
    },
    async clearAutomatic(): Promise<void> {
      // Kept files stay playable, so only the automatic copies leave memory.
      const entries = await cache.list();

      entries.forEach((entry) => {
        if (!entry.pinned) {
          memory.delete(entry.driveFileId);
        }
      });
      await cache.clearAutomatic();
    },
    list: () => cache.list(),
    async removeMany(driveFileIds: readonly string[]): Promise<void> {
      for (const driveFileId of driveFileIds) {
        memory.delete(driveFileId);
        await cache.remove(driveFileId);
      }
    },
  };
};

export type OfflineStorageService = ReturnType<
  typeof createOfflineStorageService
>;
