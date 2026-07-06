import { useEffect } from 'react';

import { patchSavedTrackPlayerWebRuntime } from './saved-track-player-web-load';

type TrackPlayerModule = typeof import('react-native-track-player');

type ResolveSavedTrackPlayerSupportDependencies = {
  appOwnership?: string | null;
  executionEnvironment?: string | null;
  loadTrackPlayerModule?: () => TrackPlayerModule;
};

type SavedTrackPlayerSupport = {
  isSupported: boolean;
  message: string | null;
  module: TrackPlayerModule | null;
};

const EXPO_GO_TRACK_PLAYER_MESSAGE =
  'Playback requires a development build because react-native-track-player is not available in Expo Go.';
const MISSING_TRACK_PLAYER_MESSAGE =
  'Playback is unavailable because the native TrackPlayer module could not be loaded.';
const FALLBACK_PROGRESS = {
  buffered: 0,
  duration: 0,
  position: 0,
};
const FALLBACK_STATE = {
  Buffering: 'buffering',
  Ended: 'ended',
  Error: 'error',
  Loading: 'loading',
  None: 'none',
  Paused: 'paused',
  Playing: 'playing',
  Ready: 'ready',
  Stopped: 'stopped',
} as const;
const FALLBACK_EVENTS = {
  PlaybackError: 'playback-error',
  PlaybackQueueEnded: 'playback-queue-ended',
  RemoteNext: 'remote-next',
  RemotePause: 'remote-pause',
  RemotePlay: 'remote-play',
  RemotePrevious: 'remote-previous',
} as const;

type ExpoRuntimeMetadata = {
  appOwnership?: string | null;
  executionEnvironment?: string | null;
};

type SavedTrackPlayerWebRuntime = {
  add?: (
    track:
      | {
          headers?: Record<string, string>;
          url: string;
        }
      | Array<{
          headers?: Record<string, string>;
          url: string;
        }>,
    insertBeforeIndex?: number,
  ) => Promise<unknown>;
  load(track: {
    headers?: Record<string, string>;
    url: string;
  }): Promise<unknown>;
  setupPlayer?: () => Promise<unknown>;
};

type SavedTrackPlayerWebWindow = Parameters<
  typeof patchSavedTrackPlayerWebRuntime
>[1]['windowApi'];

const loadTrackPlayerModule = () => {
  return require('react-native-track-player') as TrackPlayerModule;
};

const getSavedTrackPlayerWebWindow = () => {
  const globalObject = globalThis as typeof globalThis & {
    window?: SavedTrackPlayerWebWindow;
  };

  return globalObject.window ?? {};
};

const hasSavedTrackPlayerWebWindow = () => {
  const globalObject = globalThis as typeof globalThis & {
    window?: unknown;
  };

  return typeof globalObject.window !== 'undefined';
};

const canPatchSavedTrackPlayerWebRuntime = () => {
  return (
    hasSavedTrackPlayerWebWindow() &&
    typeof fetch === 'function' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function' &&
    typeof URL.revokeObjectURL === 'function'
  );
};

const patchSavedTrackPlayerModule = (trackPlayerModule: TrackPlayerModule) => {
  if (!canPatchSavedTrackPlayerWebRuntime()) {
    return;
  }

  const runtime =
    trackPlayerModule.default as Partial<SavedTrackPlayerWebRuntime>;

  if (
    typeof runtime.add !== 'function' &&
    typeof runtime.load !== 'function' &&
    typeof runtime.setupPlayer !== 'function'
  ) {
    return;
  }

  patchSavedTrackPlayerWebRuntime(runtime as SavedTrackPlayerWebRuntime, {
    fetch: globalThis.fetch.bind(globalThis),
    urlApi: globalThis.URL,
    windowApi: getSavedTrackPlayerWebWindow(),
  });
};

const getExpoRuntimeMetadata = () => {
  try {
    const expoConstantsModule = require('expo-constants') as
      | ExpoRuntimeMetadata
      | { default?: ExpoRuntimeMetadata };
    const expoConstants: ExpoRuntimeMetadata =
      (expoConstantsModule as { default?: ExpoRuntimeMetadata }).default ??
      (expoConstantsModule as ExpoRuntimeMetadata);

    return {
      appOwnership: expoConstants.appOwnership ?? null,
      executionEnvironment: expoConstants.executionEnvironment ?? null,
    };
  } catch {
    return {
      appOwnership: null,
      executionEnvironment: null,
    };
  }
};

const isExpoGoRuntime = (options: {
  appOwnership: string | null;
  executionEnvironment: string | null;
}) => {
  return (
    options.executionEnvironment === 'storeClient' ||
    options.appOwnership === 'expo'
  );
};

export const resolveSavedTrackPlayerSupport = (
  dependencies: ResolveSavedTrackPlayerSupportDependencies = {},
): SavedTrackPlayerSupport => {
  const runtimeMetadata = getExpoRuntimeMetadata();
  const appOwnership =
    dependencies.appOwnership ?? runtimeMetadata.appOwnership;
  const executionEnvironment =
    dependencies.executionEnvironment ?? runtimeMetadata.executionEnvironment;

  if (
    isExpoGoRuntime({
      appOwnership,
      executionEnvironment,
    })
  ) {
    return {
      isSupported: false,
      message: EXPO_GO_TRACK_PLAYER_MESSAGE,
      module: null,
    };
  }

  try {
    const moduleLoader =
      dependencies.loadTrackPlayerModule ?? loadTrackPlayerModule;
    const trackPlayerModule = moduleLoader();

    patchSavedTrackPlayerModule(trackPlayerModule);

    return {
      isSupported: true,
      message: null,
      module: trackPlayerModule,
    };
  } catch {
    return {
      isSupported: false,
      message: MISSING_TRACK_PLAYER_MESSAGE,
      module: null,
    };
  }
};

export const getSavedTrackPlayerModule = (
  dependencies: ResolveSavedTrackPlayerSupportDependencies = {},
) => {
  const support = resolveSavedTrackPlayerSupport(dependencies);

  if (!support.module) {
    throw new Error(support.message ?? MISSING_TRACK_PLAYER_MESSAGE);
  }

  return support.module;
};

export const getSavedTrackPlayer = (
  dependencies: ResolveSavedTrackPlayerSupportDependencies = {},
) => {
  return getSavedTrackPlayerModule(dependencies).default;
};

export const getSavedTrackPlayerEventMap = (
  dependencies: ResolveSavedTrackPlayerSupportDependencies = {},
) => {
  return (
    resolveSavedTrackPlayerSupport(dependencies).module?.Event ??
    FALLBACK_EVENTS
  );
};

export const getSavedTrackPlayerStateMap = (
  dependencies: ResolveSavedTrackPlayerSupportDependencies = {},
) => {
  return (
    resolveSavedTrackPlayerSupport(dependencies).module?.State ?? FALLBACK_STATE
  );
};

export const registerSavedTrackPlayerPlaybackService = (
  serviceFactory: () => Promise<void>,
  dependencies: ResolveSavedTrackPlayerSupportDependencies = {},
) => {
  const support = resolveSavedTrackPlayerSupport(dependencies);

  if (!support.module) {
    return false;
  }

  support.module.default.registerPlaybackService(() => serviceFactory);

  return true;
};

export const useSavedTrackPlayerPlaybackState = () => {
  const support = resolveSavedTrackPlayerSupport();

  if (!support.module) {
    return {
      state: undefined,
    };
  }

  return support.module.usePlaybackState();
};

export const useSavedTrackPlayerProgress = (updateIntervalMs: number) => {
  const support = resolveSavedTrackPlayerSupport();

  if (!support.module) {
    return FALLBACK_PROGRESS;
  }

  return support.module.useProgress(updateIntervalMs);
};

export const useSavedTrackPlayerEvents = (
  eventTypes: string[],
  handler: (event: { type: string; message?: string }) => void,
) => {
  const support = resolveSavedTrackPlayerSupport();

  if (!support.module) {
    useEffect(() => undefined, [eventTypes, handler]);
    return;
  }

  support.module.useTrackPlayerEvents(eventTypes as never[], handler as never);
};

export type SavedTrackPlayerModule = TrackPlayerModule;
