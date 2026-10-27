import type { PersistentAudioCache } from '../playback/audio-cache';
import type { OfflineStateStore } from './offline-state-store';

/** A Drive score file (PDF, MusicXML, MIDI) kept with its track. */
export type KeepScoreRequest = {
  driveFileId: string;
  headers?: Record<string, string>;
  name: string;
  url: string;
};

/** Scores carry no Drive version here; a keep always stores the current file. */
export const SCORE_SOURCE_VERSION = 'score';

export type KeepOfflineRequest = {
  driveFileId: string;
  headers?: Record<string, string>;
  /** The Drive file name, stored so the offline files view can show it. */
  name?: string;
  /** The track's Drive score files, kept along with it. */
  scores?: readonly KeepScoreRequest[];
  url: string;
  /** The Drive content version; a file without one cannot be cached. */
  version: string;
};

export type OfflineKeepingDependencies = {
  cache: Pick<PersistentAudioCache, 'detachOwner' | 'pin' | 'remove' | 'write'>;
  download: (request: KeepOfflineRequest) => Promise<Blob>;
  /** Fetches one score file; a failure leaves that score out. */
  downloadScore?: (request: KeepScoreRequest) => Promise<Blob>;
  /** The in-memory copy, dropped with the stored one so nothing lingers. */
  memory: { delete: (driveFileId: string) => void };
  state: Pick<OfflineStateStore, 'markDownloading'>;
};

/** `not-stored`: the device refused the file (storage full or unavailable). */
export type KeepOfflineResult = 'kept' | 'not-stored';

export const createOfflineKeeping = ({
  cache,
  download,
  downloadScore,
  memory,
  state,
}: OfflineKeepingDependencies) => {
  // Best effort: a score that cannot be fetched is skipped so the audio the
  // user asked for is still kept; a later Keep offline tries it again.
  const keepScores = async (request: KeepOfflineRequest) => {
    for (const score of request.scores ?? []) {
      try {
        const blob = await downloadScore?.(score);

        if (blob) {
          await cache.write(score.driveFileId, SCORE_SOURCE_VERSION, blob, {
            name: score.name,
            score: { owner: request.driveFileId },
          });
        }
      } catch {
        // Skipped; see above.
      }
    }
  };

  return {
    /**
     * Keeps a file offline: pins a stored copy, or downloads the file first
     * (through the shared download, so a download already running is joined).
     * A failed download throws and leaves nothing pinned.
     */
    async keepOffline(request: KeepOfflineRequest): Promise<KeepOfflineResult> {
      if (await cache.pin(request.driveFileId)) {
        await keepScores(request);

        return 'kept';
      }

      const finish = state.markDownloading(request.driveFileId);

      try {
        const blob = await download(request);

        // The shared download also stores the file, without waiting and
        // without keeping it; storing it kept here (writes run in order) makes
        // the keep independent of that background write.
        await cache.write(request.driveFileId, request.version, blob, {
          keep: true,
          name: request.name,
        });

        if (!(await cache.pin(request.driveFileId))) {
          return 'not-stored';
        }

        await keepScores(request);

        return 'kept';
      } finally {
        finish();
      }
    },
    async removeFromOffline(driveFileId: string): Promise<void> {
      memory.delete(driveFileId);
      await cache.remove(driveFileId);
      await cache.detachOwner(driveFileId);
    },
  };
};
