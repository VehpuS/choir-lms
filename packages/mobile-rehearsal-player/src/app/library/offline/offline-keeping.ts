import type { PersistentAudioCache } from '../playback/audio-cache';
import type { OfflineStateStore } from './offline-state-store';

/** A Drive score file (PDF, MusicXML, MIDI) kept with its track. */
export type KeepScoreRequest = {
  driveFileId: string;
  headers?: Record<string, string>;
  name: string;
  url: string;
  /** The score's Drive `modifiedTime`; without one it is stored unversioned. */
  version?: string;
};

/** The version of a score whose Drive `modifiedTime` could not be read. */
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
  cache: Pick<
    PersistentAudioCache,
    'detachOwner' | 'pin' | 'read' | 'remove' | 'write'
  >;
  download: (request: KeepOfflineRequest) => Promise<Blob>;
  /** Fetches one score file; a failure leaves that score out. */
  downloadScore?: (request: KeepScoreRequest) => Promise<Blob>;
  /** The in-memory copy, dropped with the stored one so nothing lingers. */
  memory: { delete: (driveFileId: string) => void };
  state: Pick<OfflineStateStore, 'markDownloading'>;
};

/**
 * `kept-partial`: the audio is kept but some of its score files could not be.
 * `not-stored`: the device refused the file (storage full or unavailable).
 */
export type KeepOfflineResult = 'kept' | 'kept-partial' | 'not-stored';

export const createOfflineKeeping = ({
  cache,
  download,
  downloadScore,
  memory,
  state,
}: OfflineKeepingDependencies) => {
  // Best effort: a score that cannot be fetched is skipped so the audio the
  // user asked for is still kept, and the count is returned so the caller can
  // say so; a later Keep offline tries it again. A score already stored at
  // the current Drive version is not downloaded again.
  const keepScores = async (request: KeepOfflineRequest) => {
    let skipped = 0;

    for (const score of request.scores ?? []) {
      const version = score.version ?? SCORE_SOURCE_VERSION;

      try {
        const blob =
          (await cache.read(score.driveFileId, version)) ??
          (await downloadScore?.(score));

        if (!blob) {
          skipped += 1;
          continue;
        }

        await cache.write(score.driveFileId, version, blob, {
          name: score.name,
          score: { owner: request.driveFileId },
        });
      } catch {
        skipped += 1;
      }
    }

    return skipped;
  };
  const resultFor = (skippedScores: number): KeepOfflineResult => {
    return skippedScores > 0 ? 'kept-partial' : 'kept';
  };

  return {
    /**
     * Keeps a file offline: pins a stored copy, or downloads the file first
     * (through the shared download, so a download already running is joined).
     * A failed download throws and leaves nothing pinned.
     */
    async keepOffline(request: KeepOfflineRequest): Promise<KeepOfflineResult> {
      if (await cache.pin(request.driveFileId)) {
        return resultFor(await keepScores(request));
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

        return resultFor(await keepScores(request));
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
