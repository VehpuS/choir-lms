import type { PersistentAudioCache } from '../playback/audio-cache';
import type { OfflineStateStore } from './offline-state-store';

export type KeepOfflineRequest = {
  driveFileId: string;
  headers?: Record<string, string>;
  url: string;
  /** The Drive content version; a file without one cannot be cached. */
  version: string;
};

export type OfflineKeepingDependencies = {
  cache: Pick<PersistentAudioCache, 'pin' | 'remove' | 'write'>;
  download: (request: KeepOfflineRequest) => Promise<Blob>;
  /** The in-memory copy, dropped with the stored one so nothing lingers. */
  memory: { delete: (driveFileId: string) => void };
  state: Pick<OfflineStateStore, 'markDownloading'>;
};

/** `too-large`: the file fits no budget, so it was played but not kept. */
export type KeepOfflineResult = 'kept' | 'too-large';

export const createOfflineKeeping = ({
  cache,
  download,
  memory,
  state,
}: OfflineKeepingDependencies) => {
  return {
    /**
     * Keeps a file offline: pins a stored copy, or downloads the file first
     * (through the shared download, so a download already running is joined).
     * A failed download throws and leaves nothing pinned.
     */
    async keepOffline(request: KeepOfflineRequest): Promise<KeepOfflineResult> {
      if (await cache.pin(request.driveFileId)) {
        return 'kept';
      }

      const finish = state.markDownloading(request.driveFileId);

      try {
        const blob = await download(request);

        // The shared download stores the file without waiting for it, so the
        // copy may not be there yet; writing it again is harmless.
        if (!(await cache.pin(request.driveFileId))) {
          await cache.write(request.driveFileId, request.version, blob);
        }

        return (await cache.pin(request.driveFileId)) ? 'kept' : 'too-large';
      } finally {
        finish();
      }
    },
    async removeFromOffline(driveFileId: string): Promise<void> {
      memory.delete(driveFileId);
      await cache.remove(driveFileId);
    },
  };
};
