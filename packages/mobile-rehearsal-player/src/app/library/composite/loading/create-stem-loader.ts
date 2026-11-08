import type { CompositeStem } from '@org/audio-library-models';

import { prepareStem } from '../prepared/prepare-stem';
import type { DecodedStem } from '../prepared/prepare-stem-signal';
import type {
  PreparedStemKey,
  PreparedStemStore,
} from '../prepared/prepared-stem-types';
import type { LoadStem } from './composite-stem-loader';

/** What the loader needs to know about a stem's library track. */
export type StemTrack = {
  id: string;
  /** The Drive content version; without one a prepared stem is never reused. */
  version?: string;
};

export type StemLoaderDependencies<Track extends StemTrack> = {
  compositeId: string;
  stems: readonly Pick<CompositeStem, 'id' | 'trackId'>[];
  /** The library track for a stem, or undefined when it was deleted. */
  getTrack: (trackId: string) => Track | undefined;
  store: Pick<PreparedStemStore, 'has' | 'open' | 'begin'>;
  /** The track's audio through the normal path: caches, offline store, then Drive. */
  fetchBlob: (track: Track, signal: AbortSignal) => Promise<Blob>;
  decode: (blob: Blob, signal: AbortSignal) => Promise<DecodedStem>;
  /** The audio context's rate; stems are stored at it. */
  targetSampleRate: number;
};

/** A stem whose track is gone from the library: flagged `Stem missing`, the rest play. */
export class StemMissingError extends Error {
  constructor(readonly stemId: string) {
    super('This stem’s track is no longer in the library.');
    this.name = 'StemMissingError';
  }
}

const UNVERSIONED = 'unversioned';
/** The share of a stem's progress that is the download; the rest is preparing. */
const DOWNLOAD_SHARE = 0.6;
const FULL_PROGRESS = 1;

/**
 * Loads one stem as a window reader (composite-tracks design Decisions 9 and
 * 10): a stem already prepared at the track's current version is simply
 * opened; otherwise its track is fetched, prepared into the store and then
 * opened, so playback reads every stem the same way whether it was prepared
 * just now or on an earlier day.
 */
export const createStemLoader = <Track extends StemTrack>(
  dependencies: StemLoaderDependencies<Track>,
): LoadStem => {
  return async ({ stemId, signal, onProgress }) => {
    const stem = dependencies.stems.find(
      (candidate) => candidate.id === stemId,
    );
    const track = stem ? dependencies.getTrack(stem.trackId) : undefined;

    if (!stem || !track) {
      throw new StemMissingError(stemId);
    }

    const key: PreparedStemKey = {
      compositeId: dependencies.compositeId,
      stemId,
      contentVersion: track.version ?? UNVERSIONED,
    };

    if (track.version !== undefined && (await dependencies.store.has(key))) {
      const prepared = await dependencies.store.open(key);

      if (prepared) {
        onProgress(FULL_PROGRESS);

        return prepared;
      }
    }

    const blob = await dependencies.fetchBlob(track, signal);

    onProgress(DOWNLOAD_SHARE);
    await prepareStem({
      store: dependencies.store as PreparedStemStore,
      key,
      targetSampleRate: dependencies.targetSampleRate,
      decode: (abortSignal) => dependencies.decode(blob, abortSignal ?? signal),
      signal,
      onProgress: (fraction) =>
        onProgress(
          DOWNLOAD_SHARE + fraction * (FULL_PROGRESS - DOWNLOAD_SHARE),
        ),
    });

    const reader = await dependencies.store.open(key);

    if (!reader) {
      throw new Error('The prepared stem could not be read back.');
    }

    return reader;
  };
};
