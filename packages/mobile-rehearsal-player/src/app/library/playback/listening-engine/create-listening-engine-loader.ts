import {
  checkCompositeStorageFit,
  type DriveAudioSource,
  type StorageEstimator,
} from '@org/audio-library-models';

import { getBrowserEstimator } from '../../composite/create/use-composite-storage-fit';
import { COMPOSITE_UNAVAILABLE_MESSAGE } from '../../composite/composite-capabilities';
import type { CompositeEngine } from '../../composite/engine/composite-engine';
import {
  createWebCompositeEngine,
  getCompositeAudioContext,
} from '../../composite/engine/create-web-composite-engine';
import type { CompositeLoadStore } from '../../composite/loading/composite-load-state';
import {
  createStemLoader,
  needsPreparing,
  preparedKeyFor,
} from '../../composite/loading/create-stem-loader';
import {
  buildStemLoaderDependencies,
  fetchTrackBlob,
  type CompositeLoaderDependencies,
} from '../../composite/playback/create-composite-engine-loader';
import {
  isStorageFullError,
  NO_ROOM_SUGGESTIONS,
} from '../../composite/prepared/composite-room';
import {
  LISTENING_STEM_ID,
  listeningOwnerId,
} from '../../composite/prepared/prepared-owner';
import { getPreparedStemStore } from '../../composite/prepared/prepared-stem-instance';
import { makeRoomForListeningAudio } from './listening-audio-budget';
import { getListeningLoadStore } from './listening-load-state';

/**
 * Loads a single track onto the Web Audio engine as its only stem (clear-
 * playback-while-listening design Decisions 2 and 3): the track's audio comes
 * through the normal path (the caches, the offline store, then Drive), is
 * prepared into the store the first time, and plays from there. The item that
 * plays stays the track; only its transport is the engine.
 */

const FULL_GAIN = 1;
const NO_OFFSET_MS = 0;

/** There is no room to prepare the track; it can still play on the media element. */
export class ListeningNoRoomError extends Error {
  constructor() {
    super(
      `There is not enough room to prepare this track on this device. ${NO_ROOM_SUGGESTIONS[0]}`,
    );
    this.name = 'ListeningNoRoomError';
  }
}

export type ListeningEngineLoader = (
  track: DriveAudioSource,
  options?: {
    signal?: AbortSignal;
    /** `null` when signed out; the audio then comes from this device alone. */
    accessToken?: string | null;
    /** Tracks whose prepared audio must stay while room is made (the one playing). */
    keepTrackIds?: readonly string[];
  },
) => Promise<CompositeEngine>;

type ListeningAudioOptions = NonNullable<Parameters<ListeningEngineLoader>[1]>;

/** The two things done with a track's listening audio: play it, or only get it ready. */
export type ListeningAudio = {
  loadEngine: ListeningEngineLoader;
  /** Prepares the track if it is not prepared yet, without building an engine or showing progress. */
  prepare: (
    track: DriveAudioSource,
    options?: ListeningAudioOptions,
  ) => Promise<void>;
};

export type ListeningLoaderDependencies = Pick<
  CompositeLoaderDependencies,
  'getContext' | 'store' | 'fetchBlob' | 'createEngine'
> & {
  loadState: CompositeLoadStore;
  estimator: StorageEstimator | undefined;
  budgetBytes?: number;
};

const defaultDependencies = (): ListeningLoaderDependencies => ({
  getContext: getCompositeAudioContext,
  store: getPreparedStemStore(),
  fetchBlob: fetchTrackBlob,
  createEngine: createWebCompositeEngine,
  loadState: getListeningLoadStore(),
  estimator: getBrowserEstimator(),
});

export const createListeningAudio = (
  overrides: Partial<ListeningLoaderDependencies> = {},
): ListeningAudio => {
  const dependencies = { ...defaultDependencies(), ...overrides };
  const { store } = dependencies;
  // The work in flight per track. A track is prepared ahead of its turn in the
  // queue, and its turn can come first: the load then waits for that work
  // instead of writing the same stem a second time under it.
  const inFlight = new Map<string, Promise<unknown>>();

  const obtainReader = async (
    track: DriveAudioSource,
    options: ListeningAudioOptions,
    showsProgress: boolean,
  ) => {
    const context = dependencies.getContext();

    if (!context) {
      throw new Error(COMPOSITE_UNAVAILABLE_MESSAGE);
    }

    const ownerId = listeningOwnerId(track.id);
    const keepOwnerIds = [
      ownerId,
      ...(options.keepTrackIds ?? []).map(listeningOwnerId),
    ];
    const makeRoom = (incomingBytes: number) =>
      makeRoomForListeningAudio(store, {
        incomingBytes,
        keepOwnerIds,
        budgetBytes: dependencies.budgetBytes,
      });
    const stemLoaderDependencies = buildStemLoaderDependencies({
      accessToken: options.accessToken ?? null,
      composite: {
        id: ownerId,
        stems: [
          {
            id: LISTENING_STEM_ID,
            trackId: track.id,
            name: track.name,
            offsetMs: NO_OFFSET_MS,
            mine: false,
          },
        ],
      },
      context,
      dependencies,
      // The track as it was asked for, not a later library lookup: the item
      // that is loading names its own version.
      getTrack: (trackId) => (trackId === track.id ? track : undefined),
    });
    const isFirstTime = await needsPreparing(stemLoaderDependencies);

    if (isFirstTime) {
      const { fit, bytesNeeded } = await checkCompositeStorageFit(
        [{ durationMs: track.durationMs ?? 0 }],
        context.sampleRate,
        dependencies.estimator,
      );

      // The budget first, so its own old audio is not what leaves no room.
      await makeRoom(bytesNeeded);

      if (fit === 'does-not-fit') {
        throw new ListeningNoRoomError();
      }
    }

    const progress = showsProgress
      ? dependencies.loadState.begin(
          track.id,
          [LISTENING_STEM_ID],
          isFirstTime ? 'preparing' : 'loading',
        )
      : null;

    try {
      const reader = await createStemLoader(stemLoaderDependencies)({
        stemId: LISTENING_STEM_ID,
        signal: options.signal ?? new AbortController().signal,
        onProgress: (fraction) =>
          progress?.update([
            { stemId: LISTENING_STEM_ID, status: 'loading', fraction },
          ]),
      });

      await store.markUsed(
        preparedKeyFor(ownerId, LISTENING_STEM_ID, {
          id: track.id,
          version: track.modifiedTime,
        }),
      );

      if (isFirstTime) {
        // The length was a guess before decoding (or unknown): hold the budget
        // to what was really written.
        await makeRoom(0);
      }

      return reader;
    } catch (error) {
      throw isStorageFullError(error) ? new ListeningNoRoomError() : error;
    } finally {
      progress?.end();
    }
  };

  /** One piece of work per track at a time; a later one starts when the earlier ends, however it ends. */
  const inTurn = async <Result>(
    track: DriveAudioSource,
    showsProgress: boolean,
    work: () => Promise<Result>,
  ): Promise<Result> => {
    const earlier = inFlight.get(track.id);

    if (earlier) {
      // Say so while waiting for a preparation that shows no progress itself.
      const waiting = showsProgress
        ? dependencies.loadState.begin(
            track.id,
            [LISTENING_STEM_ID],
            'preparing',
          )
        : null;

      await earlier.catch(() => undefined);
      waiting?.end();
    }

    const current = work();

    inFlight.set(track.id, current);

    try {
      return await current;
    } finally {
      if (inFlight.get(track.id) === current) {
        inFlight.delete(track.id);
      }
    }
  };

  return {
    loadEngine: (track, options = {}) =>
      inTurn(track, true, async () => {
        const reader = await obtainReader(track, options, true);

        return dependencies.createEngine({
          stems: [{ id: LISTENING_STEM_ID, offsetMs: NO_OFFSET_MS, reader }],
          initialGains: { [LISTENING_STEM_ID]: FULL_GAIN },
        });
      }),
    prepare: (track, options = {}) =>
      inTurn(track, false, async () => {
        await obtainReader(track, options, false);
      }),
  };
};

export const createListeningEngineLoader = (
  overrides: Partial<ListeningLoaderDependencies> = {},
): ListeningEngineLoader => createListeningAudio(overrides).loadEngine;

let appAudio: ListeningAudio | null = null;

/** The app's one listening audio, so a load and preparing ahead share the work in flight. */
export const getListeningAudio = (): ListeningAudio => {
  appAudio ??= createListeningAudio();

  return appAudio;
};
