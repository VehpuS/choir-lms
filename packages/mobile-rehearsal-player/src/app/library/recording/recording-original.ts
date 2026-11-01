import type { AudioStoreEntry } from '../playback/audio-cache/audio-store-types';
import type { Recording } from '@org/audio-library-models';

/**
 * Finds the original track audio for a recording from its metadata
 * (rehearsal-recording design Decision 13). A recording owns no copy of its
 * track: the audio comes from the normal track path (the playback cache or the
 * offline store, which are one store with a pinned tier, then Drive). This
 * file only reads: it never pins, writes, or copies a track.
 */

export const ORIGINAL_CHANGED_LABEL = 'Original track changed';

export type OriginalUnavailableReason = 'offline' | 'removed' | 'deleted';

export type OriginalAudioDependencies = {
  /** Every stored file's entry, without reading audio (a read at another version drops the file). */
  listStored: () => Promise<readonly AudioStoreEntry[]>;
  /** The stored bytes at exactly this version; only called after `listStored` showed a match. */
  readStored: (driveFileId: string, version: string) => Promise<Blob | null>;
  /** Fetches the file from Drive. */
  download: (driveFileId: string, version?: string) => Promise<Blob>;
  /** The saved track in the library for this Drive file, with its current version. */
  findLibraryTrack: (
    driveFileId: string,
  ) => { modifiedTime?: string } | undefined;
  isOnline: () => boolean;
  /** Whether a download error means the file is gone from Drive. */
  isNotFound?: (error: unknown) => boolean;
};

export class OriginalUnavailableError extends Error {
  readonly reason: OriginalUnavailableReason;

  constructor(reason: OriginalUnavailableReason) {
    super(`Original track unavailable: ${reason}`);
    this.name = 'OriginalUnavailableError';
    this.reason = reason;
  }
}

export type OriginalResolution =
  | {
      status: 'ready';
      /** The file's version differs from the one recorded against: alignment may be off. */
      changed: boolean;
      origin: 'stored' | 'drive';
      /** Fetches the audio; rejects with `OriginalUnavailableError` if Drive no longer has it. */
      load: () => Promise<Blob>;
    }
  | {
      status: 'unavailable';
      reason: OriginalUnavailableReason;
      /** Plain words for the overlay and the export dialog. */
      message: string;
    };

const UNAVAILABLE_MESSAGES: Record<OriginalUnavailableReason, string> = {
  offline:
    'The overlay needs a connection: this track is not stored on this device.',
  removed:
    'The track is no longer in your library, so the recording plays alone.',
  deleted: 'The track was deleted from Drive, so the recording plays alone.',
};

const unavailable = (
  reason: OriginalUnavailableReason,
): OriginalResolution => ({
  status: 'unavailable',
  reason,
  message: UNAVAILABLE_MESSAGES[reason],
});

export const resolveRecordingOriginal = async (
  recording: Pick<Recording, 'source'>,
  deps: OriginalAudioDependencies,
): Promise<OriginalResolution> => {
  const { driveFileId, contentVersion } = recording.source;
  const stored = (await deps.listStored()).find(
    (entry) => entry.driveFileId === driveFileId && entry.kind !== 'score',
  );
  const track = deps.findLibraryTrack(driveFileId);
  const currentVersion = track?.modifiedTime;

  const fromStore = (entry: AudioStoreEntry): OriginalResolution => ({
    status: 'ready',
    changed:
      contentVersion !== undefined && entry.sourceVersion !== contentVersion,
    origin: 'stored',
    load: async () => {
      const blob = await deps.readStored(driveFileId, entry.sourceVersion);

      if (!blob) {
        throw new OriginalUnavailableError('offline');
      }

      return blob;
    },
  });

  // The stored copy is the best answer: it plays offline and costs nothing.
  if (stored) {
    return fromStore(stored);
  }

  if (!track) {
    return unavailable('removed');
  }

  if (!deps.isOnline()) {
    return unavailable('offline');
  }

  const version = currentVersion ?? contentVersion;

  return {
    status: 'ready',
    changed:
      contentVersion !== undefined &&
      currentVersion !== undefined &&
      currentVersion !== contentVersion,
    origin: 'drive',
    load: async () => {
      try {
        return await deps.download(driveFileId, version);
      } catch (error) {
        throw deps.isNotFound?.(error)
          ? new OriginalUnavailableError('deleted')
          : error;
      }
    },
  };
};
