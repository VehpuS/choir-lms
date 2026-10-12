/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveSavedTrackPlayerSupport,
  type SavedTrackPlayerModule,
} from './saved-track-player-interop.js';

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
});
