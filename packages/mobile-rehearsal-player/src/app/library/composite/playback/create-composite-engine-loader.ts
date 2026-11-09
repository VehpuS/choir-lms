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
import {
  getCompositeLoadStore,
  type CompositeLoadStore,
} from '../loading/composite-load-state';
import type { StemLoadFailure } from '../loading/composite-stem-loader';
import {
  createStemLoader,
  needsPreparing,
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

export type AudioDecoder = {
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
  /** Where per-stem progress is published for the playback screen. */
  loadState: CompositeLoadStore;
};

type LibraryStemTrack = StemTrack & { source: DriveAudioSource };

/** The track's audio through the normal path: the caches, the offline store, then Drive. */
export const fetchTrackBlob: CompositeLoaderDependencies['fetchBlob'] = async (
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

/**
 * What a composite's stem loader needs, from the app's pieces: shared by the
 * engine loader and the mix export, so both prepare stems the same way.
 */
export const buildStemLoaderDependencies = (options: {
  accessToken: string | null;
  composite: Pick<CompositeTrack, 'id' | 'stems'>;
  context: AudioDecoder;
  dependencies: Pick<CompositeLoaderDependencies, 'store' | 'fetchBlob'>;
  getTrack: (trackId: string) => DriveAudioSource | undefined;
}) => {
  const { accessToken, composite, context, dependencies } = options;
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

  return {
    compositeId: composite.id,
    stems: composite.stems,
    getTrack: (trackId: string) => {
      const source = options.getTrack(trackId);

      return source
        ? { id: source.id, version: source.modifiedTime, source }
        : undefined;
    },
    store: dependencies.store,
    fetchBlob: (track: LibraryStemTrack) =>
      dependencies.fetchBlob(track.source, accessToken),
    decode,
    targetSampleRate: context.sampleRate,
  };
};

const defaultDependencies = (): CompositeLoaderDependencies => ({
  getContext: getCompositeAudioContext,
  store: getPreparedStemStore(),
  fetchBlob: fetchTrackBlob,
  createEngine: createWebCompositeEngine,
  loadState: getCompositeLoadStore(),
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

    const stemLoaderDependencies = buildStemLoaderDependencies({
      accessToken: options.accessToken ?? null,
      composite,
      context,
      dependencies,
      getTrack: host.getTrack,
    });
    // A storage error here only costs the explanation: the load itself reports it.
    const isFirstTime = await needsPreparing(stemLoaderDependencies).catch(
      () => false,
    );
    const progress = dependencies.loadState.begin(
      composite.id,
      composite.stems.map((stem) => stem.id),
      isFirstTime ? 'preparing' : 'loading',
    );

    try {
      return await loadCompositeEngineFromStems({
        composite,
        signal: options.signal,
        loadStem: createStemLoader<LibraryStemTrack>(stemLoaderDependencies),
        onProgress: progress.update,
        createEngine: dependencies.createEngine,
        onStemsFailed: (failed) => host.onStemsFailed?.(composite.id, failed),
      });
    } finally {
      progress.end();
    }
  };
};
