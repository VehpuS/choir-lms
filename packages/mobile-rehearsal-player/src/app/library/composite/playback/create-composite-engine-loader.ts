import { buildDriveMediaUrl } from '@org/google-drive';
import type {
  CompositeTrack,
  DriveAudioSource,
} from '@org/audio-library-models';

import { isDeviceOffline } from '../../offline/device-connection';
import { createSavedTrackDownloadProgressStore } from '../../playback/utils/saved-track-download-progress';
import { readStoredSavedTrackBlob } from '../../playback/utils/saved-track-stored-copy';
import { startSavedTrackDownload } from '../../playback/utils/saved-track-web-download';
import { COMPOSITE_UNAVAILABLE_MESSAGE } from '../composite-capabilities';
import {
  createWebCompositeEngine,
  getCompositeAudioContext,
} from '../engine/create-web-composite-engine';
import type { StemLoadFailure } from '../loading/composite-stem-loader';
import {
  createStemLoader,
  type StemTrack,
} from '../loading/create-stem-loader';
import {
  loadCompositeEngineFromStems,
  type LoadCompositeEngineOptions,
} from '../loading/load-composite-engine';
import type { DecodedStem } from '../prepared/prepare-stem-signal';
import { getPreparedStemStore } from '../prepared/prepared-stem-instance';
import type { PreparedStemStore } from '../prepared/prepared-stem-types';
import type { CompositeEngineLoader } from './composite-engine-loader';

/** What the loader reads from the app: the composites, the library and the Drive session. */
export type CompositeLoaderHost = {
  getComposite: (compositeId: string) => CompositeTrack | undefined;
  getTrack: (trackId: string) => DriveAudioSource | undefined;
  /** Stems that could not load, so the Mix panel can flag them `Stem missing`. */
  onStemsFailed?: (
    compositeId: string,
    failed: readonly StemLoadFailure[],
  ) => void;
};

type AudioDecoder = {
  sampleRate: number;
  decodeAudioData: (audio: ArrayBuffer) => Promise<{
    numberOfChannels: number;
    sampleRate: number;
    getChannelData: (channel: number) => Float32Array;
  }>;
};

/** The browser-facing pieces, replaceable in specs. */
export type CompositeLoaderDependencies = {
  getContext: () => AudioDecoder | null;
  store: PreparedStemStore;
  fetchBlob: (
    track: DriveAudioSource,
    accessToken: string | null,
  ) => Promise<Blob>;
  createEngine: LoadCompositeEngineOptions['createEngine'];
};

type LibraryStemTrack = StemTrack & { source: DriveAudioSource };

/** The track's audio through the normal path: the caches, the offline store, then Drive. */
const fetchTrackBlob: CompositeLoaderDependencies['fetchBlob'] = async (
  source,
  accessToken,
) => {
  const url = buildDriveMediaUrl(source.driveFileId);
  const version = source.modifiedTime;

  if (accessToken === null || isDeviceOffline()) {
    return readStoredSavedTrackBlob({ url, version });
  }

  return startSavedTrackDownload(
    { headers: { Authorization: `Bearer ${accessToken}` }, url },
    {
      clearTimer: (handle) => {
        clearTimeout(handle as ReturnType<typeof setTimeout>);
      },
      fetch: globalThis.fetch.bind(globalThis),
      now: () => Date.now(),
      setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
      // Its own progress store: the mini-player shows no loading state for a stem.
      store: createSavedTrackDownloadProgressStore(),
    },
    // Not cancelled by a player reset: the stem is wanted by this load, which
    // has its own supersede signal, and the download is shared with others.
    { cancelOnReset: false, name: source.name, version },
  );
};

const defaultDependencies = (): CompositeLoaderDependencies => ({
  getContext: getCompositeAudioContext,
  store: getPreparedStemStore(),
  fetchBlob: fetchTrackBlob,
  createEngine: createWebCompositeEngine,
});

/**
 * The loader `loadIntoPlayer`'s composite branch calls (task 3.5): looks up the
 * composite by the item's synthetic source id, loads and prepares its stems and
 * builds the engine. Registered where composites can play.
 */
export const createCompositeEngineLoader = (
  host: CompositeLoaderHost,
  overrides: Partial<CompositeLoaderDependencies> = {},
): CompositeEngineLoader => {
  const dependencies = { ...defaultDependencies(), ...overrides };

  return async (item, options) => {
    const composite = host.getComposite(item.source.id);
    const context = dependencies.getContext();

    if (!composite) {
      throw new Error('This composite is no longer in the library.');
    }

    if (!context) {
      throw new Error(COMPOSITE_UNAVAILABLE_MESSAGE);
    }

    const accessToken = options.accessToken ?? null;
    const decode = async (blob: Blob): Promise<DecodedStem> => {
      // The context decodes at its own rate, so no resampling is usually needed.
      const buffer = await context.decodeAudioData(await blob.arrayBuffer());

      return {
        channels: Array.from({ length: buffer.numberOfChannels }, (_, index) =>
          buffer.getChannelData(index),
        ),
        sampleRate: buffer.sampleRate,
      };
    };

    return loadCompositeEngineFromStems({
      composite,
      signal: options.signal,
      loadStem: createStemLoader<LibraryStemTrack>({
        compositeId: composite.id,
        stems: composite.stems,
        getTrack: (trackId) => {
          const source = host.getTrack(trackId);

          return source
            ? { id: source.id, version: source.modifiedTime, source }
            : undefined;
        },
        store: dependencies.store,
        fetchBlob: (track) => dependencies.fetchBlob(track.source, accessToken),
        decode,
        targetSampleRate: context.sampleRate,
      }),
      createEngine: dependencies.createEngine,
      onStemsFailed: (failed) => host.onStemsFailed?.(composite.id, failed),
    });
  };
};
