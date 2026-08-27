/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dispatchSavedTrackPlaybackRemoteCommand,
  registerSavedTrackPlaybackRemoteCommandHandlers,
} from './saved-track-playback-remote-controls.js';
import { registerSavedTrackPlaybackRemoteEventListeners } from './saved-track-playback-service.js';
import {
  getSavedTrackPlayerEventMap,
  resolveSavedTrackPlayerSupport,
  type SavedTrackPlayerModule,
} from './saved-track-player-interop.js';
import { syncSavedTrackPlayerCapabilities } from './saved-track-player-runtime.js';

type SavedTrackPlayerInteropTestGlobals = {
  fetch?: typeof globalThis.fetch;
  URL?: typeof globalThis.URL;
  window?: unknown;
};

const createFakeTrackPlayerModule = () => {
  const runtime = {
    async add() {
      return undefined;
    },
    async load() {
      return undefined;
    },
    async setupPlayer() {
      return undefined;
    },
  };

  return {
    module: {
      Event: {},
      State: {},
      default: runtime,
      usePlaybackState() {
        return {
          state: undefined,
        };
      },
      useProgress() {
        return {
          buffered: 0,
          duration: 0,
          position: 0,
        };
      },
      useTrackPlayerEvents() {
        return undefined;
      },
    } as unknown as SavedTrackPlayerModule,
    runtime,
  };
};

const withSavedTrackPlayerWebGlobals = async (
  callback: () => Promise<void> | void,
) => {
  const globalObject =
    globalThis as unknown as SavedTrackPlayerInteropTestGlobals;
  const previousFetch = globalObject.fetch;
  const previousUrl = globalObject.URL;
  const previousWindow = globalObject.window;

  globalObject.fetch = (async () => {
    return {
      async blob() {
        return {} as Blob;
      },
      ok: true,
      status: 200,
    };
  }) as unknown as typeof globalThis.fetch;
  globalObject.URL = {
    ...globalObject.URL,
    createObjectURL() {
      return 'blob:track-1';
    },
    revokeObjectURL() {
      return undefined;
    },
  } as unknown as typeof globalThis.URL;
  globalObject.window = {};

  try {
    await callback();
  } finally {
    if (typeof previousFetch === 'undefined') {
      delete globalObject.fetch;
    } else {
      globalObject.fetch = previousFetch;
    }

    if (typeof previousUrl === 'undefined') {
      delete globalObject.URL;
    } else {
      globalObject.URL = previousUrl;
    }

    if (typeof previousWindow === 'undefined') {
      delete globalObject.window;
    } else {
      globalObject.window = previousWindow;
    }
  }
};

describe('saved track playback service', () => {
  it('reports Expo Go as unsupported without loading TrackPlayer', () => {
    let didAttemptLoad = false;

    const support = resolveSavedTrackPlayerSupport({
      appOwnership: 'expo',
      executionEnvironment: 'storeClient',
      loadTrackPlayerModule() {
        didAttemptLoad = true;
        throw new Error('should not load');
      },
    });

    assert.equal(didAttemptLoad, false);
    assert.equal(support.isSupported, false);
    assert.match(support.message ?? '', /development build.*Expo Go/i);
  });

  it('loads TrackPlayer when native playback support is available', () => {
    const { module: fakeModule } = createFakeTrackPlayerModule();

    const support = resolveSavedTrackPlayerSupport({
      appOwnership: null,
      executionEnvironment: 'standalone',
      platformOs: 'ios',
      loadTrackPlayerModule() {
        return fakeModule;
      },
    });

    assert.equal(support.isSupported, true);
    assert.equal(support.module, fakeModule);
    assert.equal(support.message, null);
  });

  it('does not apply the web blob patch on native platforms', async () => {
    await withSavedTrackPlayerWebGlobals(async () => {
      const { module: fakeModule, runtime } = createFakeTrackPlayerModule();
      const originalAdd = runtime.add;
      const originalLoad = runtime.load;
      const originalSetupPlayer = runtime.setupPlayer;

      const support = resolveSavedTrackPlayerSupport({
        appOwnership: null,
        executionEnvironment: 'standalone',
        platformOs: 'ios',
        loadTrackPlayerModule() {
          return fakeModule;
        },
      });

      assert.equal(support.isSupported, true);
      assert.equal(runtime.add, originalAdd);
      assert.equal(runtime.load, originalLoad);
      assert.equal(runtime.setupPlayer, originalSetupPlayer);
    });
  });

  it('applies the web blob patch on web platforms', async () => {
    await withSavedTrackPlayerWebGlobals(async () => {
      const { module: fakeModule, runtime } = createFakeTrackPlayerModule();
      const originalAdd = runtime.add;
      const originalLoad = runtime.load;
      const originalSetupPlayer = runtime.setupPlayer;

      const support = resolveSavedTrackPlayerSupport({
        appOwnership: null,
        executionEnvironment: 'standalone',
        platformOs: 'web',
        loadTrackPlayerModule() {
          return fakeModule;
        },
      });

      assert.equal(support.isSupported, true);
      assert.notEqual(runtime.add, originalAdd);
      assert.notEqual(runtime.load, originalLoad);
      assert.notEqual(runtime.setupPlayer, originalSetupPlayer);
    });
  });

  it('dispatches remote commands to the latest registered handlers', async () => {
    const receivedCommands: string[] = [];
    const unregisterFirstHandlers =
      registerSavedTrackPlaybackRemoteCommandHandlers({
        async next() {
          receivedCommands.push('first:next');
        },
        async pause() {
          receivedCommands.push('first:pause');
        },
        async play() {
          receivedCommands.push('first:play');
        },
        async previous() {
          receivedCommands.push('first:previous');
        },
      });
    const unregisterSecondHandlers =
      registerSavedTrackPlaybackRemoteCommandHandlers({
        async next() {
          receivedCommands.push('second:next');
        },
        async pause() {
          receivedCommands.push('second:pause');
        },
        async play() {
          receivedCommands.push('second:play');
        },
        async previous() {
          receivedCommands.push('second:previous');
        },
      });

    unregisterFirstHandlers();

    assert.equal(await dispatchSavedTrackPlaybackRemoteCommand('play'), true);
    assert.deepEqual(receivedCommands, ['second:play']);

    unregisterSecondHandlers();

    assert.equal(await dispatchSavedTrackPlaybackRemoteCommand('play'), false);
  });

  it('registers remote transport listeners that dispatch queue commands', async () => {
    const fallbackEventMap = getSavedTrackPlayerEventMap({
      appOwnership: 'expo',
      executionEnvironment: 'storeClient',
    });
    type RemoteEvents = NonNullable<
      NonNullable<
        Parameters<typeof registerSavedTrackPlaybackRemoteEventListeners>[0]
      >['remoteEvents']
    >;
    const remoteEvents: RemoteEvents = {
      play: fallbackEventMap.RemotePlay as RemoteEvents['play'],
      pause: fallbackEventMap.RemotePause as RemoteEvents['pause'],
      next: fallbackEventMap.RemoteNext as RemoteEvents['next'],
      previous: fallbackEventMap.RemotePrevious as RemoteEvents['previous'],
    };
    const listeners = new Map<
      (typeof remoteEvents)[keyof typeof remoteEvents],
      () => Promise<void> | void
    >();
    const removedEvents: Array<
      (typeof remoteEvents)[keyof typeof remoteEvents]
    > = [];
    const receivedCommands: string[] = [];
    const cleanup = registerSavedTrackPlaybackRemoteEventListeners({
      async dispatchRemoteCommand(command) {
        receivedCommands.push(command);
        return true;
      },
      player: {
        addEventListener(eventName, handler) {
          listeners.set(
            eventName as (typeof remoteEvents)[keyof typeof remoteEvents],
            handler,
          );

          return {
            remove() {
              removedEvents.push(
                eventName as (typeof remoteEvents)[keyof typeof remoteEvents],
              );
            },
          };
        },
      },
      remoteEvents,
    });

    assert.deepEqual(
      [...listeners.keys()],
      [
        remoteEvents.play,
        remoteEvents.pause,
        remoteEvents.next,
        remoteEvents.previous,
      ],
    );

    await listeners.get(remoteEvents.next)?.();
    await listeners.get(remoteEvents.previous)?.();
    cleanup();

    assert.deepEqual(receivedCommands, ['next', 'previous']);
    assert.deepEqual(removedEvents, [
      remoteEvents.play,
      remoteEvents.pause,
      remoteEvents.next,
      remoteEvents.previous,
    ]);
  });

  it('adds queue navigation capabilities when a playlist session is active', async () => {
    const appliedOptions: unknown[] = [];
    const lifecycleCalls: string[] = [];
    const capability = {
      Pause: 'pause',
      Play: 'play',
      SeekTo: 'seek-to',
      SkipToNext: 'skip-to-next',
      SkipToPrevious: 'skip-to-previous',
      Stop: 'stop',
    } as unknown as SavedTrackPlayerModule['Capability'];

    await syncSavedTrackPlayerCapabilities(
      {
        supportsQueueNavigation: true,
      },
      {
        async ensurePlayerReady() {
          lifecycleCalls.push('ensurePlayerReady');
        },
        player: {
          async updateOptions(options) {
            appliedOptions.push(options);
          },
        },
        trackPlayerModule: {
          Capability: capability,
        },
      },
    );

    assert.deepEqual(lifecycleCalls, ['ensurePlayerReady']);
    assert.deepEqual(appliedOptions, [
      {
        capabilities: [
          capability.Play,
          capability.Pause,
          capability.Stop,
          capability.SeekTo,
          capability.SkipToNext,
          capability.SkipToPrevious,
        ],
        compactCapabilities: [capability.Play, capability.Pause],
        notificationCapabilities: [
          capability.Play,
          capability.Pause,
          capability.Stop,
          capability.SeekTo,
          capability.SkipToNext,
          capability.SkipToPrevious,
        ],
      },
    ]);
  });
});
