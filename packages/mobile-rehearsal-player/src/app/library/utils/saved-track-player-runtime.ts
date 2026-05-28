import type { PlayableItem } from '@org/audio-library-models';

import {
  createSavedTrackPlaybackRequest,
  isTrackPlayerAlreadyInitializedError,
  normalizePlaybackVolumeLevel,
  type SavedTrackPlayerTrack,
} from './saved-track-playback-view-model';
import {
  getSavedTrackPlayer,
  getSavedTrackPlayerModule,
  type SavedTrackPlayerModule,
} from './saved-track-player-interop';

const DEFAULT_PLAYBACK_VOLUME_LEVEL = 1;
const DURATION_PROBE_ATTEMPT_COUNT = 24;
const DURATION_PROBE_INTERVAL_MS = 250;

let playerSetupPromise: Promise<void> | null = null;

type SavedTrackPlayerRuntime = Pick<
  TrackPlayerModule['default'],
  | 'add'
  | 'getProgress'
  | 'getVolume'
  | 'pause'
  | 'play'
  | 'reset'
  | 'setPlayWhenReady'
  | 'setVolume'
  | 'setupPlayer'
  | 'updateOptions'
>;

type SavedTrackPlayerCapabilityModule = Pick<TrackPlayerModule, 'Capability'>;

type SavedTrackPlayerCapabilityOptions = {
  supportsQueueNavigation: boolean;
};

type SavedTrackPlayerCapabilityRuntime = Pick<
  SavedTrackPlayerRuntime,
  'updateOptions'
>;

type ResolveSavedTrackDurationFromPlayerDependencies = {
  ensurePlayerReady?: () => Promise<void>;
  player?: SavedTrackPlayerRuntime;
  wait?: (ms: number) => Promise<void>;
};

type SyncSavedTrackPlayerCapabilitiesDependencies = {
  ensurePlayerReady?: () => Promise<void>;
  player?: SavedTrackPlayerCapabilityRuntime;
  trackPlayerModule?: SavedTrackPlayerCapabilityModule;
};

const getTrackPlayerModule = () => {
  return getSavedTrackPlayerModule();
};

const getDefaultSavedTrackPlayerRuntime = () => {
  return getSavedTrackPlayer();
};

const createSavedTrackPlayerOptionSet = (
  trackPlayerModule: SavedTrackPlayerCapabilityModule,
  options: SavedTrackPlayerCapabilityOptions,
) => {
  const { Capability } = trackPlayerModule;
  const baseCapabilities = [
    Capability.Play,
    Capability.Pause,
    Capability.Stop,
    Capability.SeekTo,
  ];
  const queueCapabilities = options.supportsQueueNavigation
    ? [Capability.SkipToNext, Capability.SkipToPrevious]
    : [];

  return {
    capabilities: [...baseCapabilities, ...queueCapabilities],
    compactCapabilities: [Capability.Play, Capability.Pause],
    notificationCapabilities: [...baseCapabilities, ...queueCapabilities],
  };
};

const applySavedTrackPlayerCapabilities = async (
  trackPlayerModule: SavedTrackPlayerCapabilityModule,
  player: SavedTrackPlayerCapabilityRuntime,
  options: SavedTrackPlayerCapabilityOptions,
) => {
  await player.updateOptions(
    createSavedTrackPlayerOptionSet(trackPlayerModule, options),
  );
};

const waitForDurationProbeTick = async (ms: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

const resolveProgressDurationMs = async (player: SavedTrackPlayerRuntime) => {
  const { duration } = await player.getProgress();

  if (duration <= 0) {
    return null;
  }

  return Math.round(duration * 1000);
};

export const ensureSavedTrackPlayerReady = async () => {
  const trackPlayerModule = getTrackPlayerModule();
  const player = trackPlayerModule.default;

  if (!playerSetupPromise) {
    playerSetupPromise = player
      .setupPlayer()
      .catch((error) => {
        if (isTrackPlayerAlreadyInitializedError(error)) {
          return;
        }

        throw error;
      })
      .then(async () => {
        await applySavedTrackPlayerCapabilities(trackPlayerModule, player, {
          supportsQueueNavigation: false,
        });
      })
      .catch((error) => {
        playerSetupPromise = null;
        throw error;
      });
  }

  return playerSetupPromise;
};

export const syncSavedTrackPlayerCapabilities = async (
  options: SavedTrackPlayerCapabilityOptions,
  dependencies: SyncSavedTrackPlayerCapabilitiesDependencies = {},
) => {
  const trackPlayerModule =
    dependencies.trackPlayerModule ?? getTrackPlayerModule();
  const player = dependencies.player ?? getDefaultSavedTrackPlayerRuntime();
  const ensurePlayerReady =
    dependencies.ensurePlayerReady ?? (() => ensureSavedTrackPlayerReady());

  await ensurePlayerReady();
  await applySavedTrackPlayerCapabilities(trackPlayerModule, player, options);
};

export const resolveSavedTrackDurationFromPlayer = async (
  options: {
    accessToken: string;
    playableItem: PlayableItem;
  },
  dependencies: ResolveSavedTrackDurationFromPlayerDependencies = {},
) => {
  const player = dependencies.player ?? getDefaultSavedTrackPlayerRuntime();
  const ensurePlayerReady =
    dependencies.ensurePlayerReady ?? (() => ensureSavedTrackPlayerReady());
  const wait = dependencies.wait ?? waitForDurationProbeTick;
  const playbackRequest = createSavedTrackPlaybackRequest({
    accessToken: options.accessToken,
    playableItem: options.playableItem,
  });
  const initialVolumeLevel = normalizePlaybackVolumeLevel(
    await player.getVolume().catch(() => DEFAULT_PLAYBACK_VOLUME_LEVEL),
  );

  try {
    await ensurePlayerReady();
    await player.reset();
    await player.add(playbackRequest.track as SavedTrackPlayerTrack);
    await player.setPlayWhenReady(false);

    const loadedDurationMs = await resolveProgressDurationMs(player);

    if (loadedDurationMs !== null) {
      return loadedDurationMs;
    }

    // Some Drive-backed tracks do not surface duration until playback starts,
    // so briefly start a muted probe and stop as soon as metadata resolves.
    await player.setVolume(0);
    await player.play();

    for (
      let attemptIndex = 0;
      attemptIndex < DURATION_PROBE_ATTEMPT_COUNT;
      attemptIndex += 1
    ) {
      const probedDurationMs = await resolveProgressDurationMs(player);

      if (probedDurationMs !== null) {
        return probedDurationMs;
      }

      await wait(DURATION_PROBE_INTERVAL_MS);
    }

    return null;
  } finally {
    await player.pause().catch(() => undefined);
    await player.setPlayWhenReady(false).catch(() => false);
    await player.setVolume(initialVolumeLevel).catch(() => undefined);
    await player.reset().catch(() => undefined);
  }
};
