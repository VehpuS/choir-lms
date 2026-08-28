/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model.js';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../storage/local-library-storage.js';
import {
  loadSavedRehearsalLibrarySources,
  resolveSavedSourceDurationUpdate,
  useSavedRehearsalLibrary,
} from './use-saved-rehearsal-library.js';

// Tells React this environment intentionally drives updates through
// act(...), since nothing else here (no Jest) sets this for us.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const SAVED_SOURCE: DriveLibrarySource = {
  id: 'drive:warmup-track',
  provider: 'google-drive',
  driveFileId: 'warmup-track',
  name: 'Warmup.mp3',
  mimeType: 'audio/mpeg',
  extension: 'mp3',
  durationMs: 92000,
  createdAt: '2026-05-10T10:00:00.000Z',
  availability: {
    status: 'available',
  },
};

describe('loadSavedRehearsalLibrarySources', () => {
  it('returns saved sources on the first successful bootstrap read', async () => {
    const result = await loadSavedRehearsalLibrarySources(
      {
        async listSources() {
          return [SAVED_SOURCE];
        },
      },
      'local-device-user',
    );

    assert.deepEqual(result, [SAVED_SOURCE]);
  });

  it('retries the bootstrap read once before succeeding', async () => {
    let attemptCount = 0;

    const result = await loadSavedRehearsalLibrarySources(
      {
        async listSources() {
          attemptCount += 1;

          if (attemptCount === 1) {
            throw new Error('storage warming up');
          }

          return [SAVED_SOURCE];
        },
      },
      'local-device-user',
    );

    assert.equal(attemptCount, 2);
    assert.deepEqual(result, [SAVED_SOURCE]);
  });

  it('falls back to an empty bootstrap state when setup never succeeds', async () => {
    let attemptCount = 0;

    const result = await loadSavedRehearsalLibrarySources(
      {
        async listSources() {
          attemptCount += 1;
          throw new Error('storage unavailable');
        },
      },
      'local-device-user',
    );

    assert.equal(attemptCount, 2);
    assert.deepEqual(result, []);
  });
});

describe('resolveSavedSourceDurationUpdate', () => {
  it('returns a saved source with a learned duration when metadata was missing', () => {
    assert.deepEqual(
      resolveSavedSourceDurationUpdate(
        [
          {
            ...SAVED_SOURCE,
            durationMs: undefined,
          },
        ],
        SAVED_SOURCE.id,
        93000,
      ),
      {
        ...SAVED_SOURCE,
        durationMs: 93000,
      },
    );
  });

  it('skips updates when the saved source is missing or already has that duration', () => {
    assert.equal(
      resolveSavedSourceDurationUpdate([], SAVED_SOURCE.id, 93000),
      null,
    );
    assert.equal(
      resolveSavedSourceDurationUpdate(
        [
          {
            ...SAVED_SOURCE,
            durationMs: 93000,
          },
        ],
        SAVED_SOURCE.id,
        93000,
      ),
      null,
    );
  });
});

// `useSavedRehearsalLibrary` talks to a module-level
// `AsyncStoragePracticeRepository` singleton rather than an injected one, so
// exercising `saveSource`/`persistSource` for real means swapping the
// underlying `@react-native-async-storage/async-storage` functions for an
// in-memory store, the same approach `rehearsal-playback.spec.ts` uses in
// `audio-library-runtime`.
const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;

const ORIGINAL_ASYNC_STORAGE = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};

const installMemoryAsyncStorage = () => {
  const store = new Map<string, string>();

  mutableAsyncStorage.getItem = async (key: string) => store.get(key) ?? null;
  mutableAsyncStorage.removeItem = async (key: string) => {
    store.delete(key);
  };
  mutableAsyncStorage.setItem = async (key: string, value: string) => {
    store.set(key, value);
  };
};

const restoreAsyncStorage = () => {
  mutableAsyncStorage.getItem = ORIGINAL_ASYNC_STORAGE.getItem;
  mutableAsyncStorage.removeItem = ORIGINAL_ASYNC_STORAGE.removeItem;
  mutableAsyncStorage.setItem = ORIGINAL_ASYNC_STORAGE.setItem;
};

const NEW_TAGS = ['Alto', 'Section leader'];

type SavedRehearsalLibraryHookResult = ReturnType<
  typeof useSavedRehearsalLibrary
>;

const waitForMicrotaskFlush = async () => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
};

const renderSavedRehearsalLibraryHook = async () => {
  const hookResultBox: { current: SavedRehearsalLibraryHookResult | null } = {
    current: null,
  };

  const Harness = () => {
    hookResultBox.current = useSavedRehearsalLibrary();
    return null;
  };

  let renderer!: ReactTestRenderer;

  await act(async () => {
    renderer = create(createElement(Harness));
  });

  // Flush the async bootstrap load (storage probe + listSources) the hook
  // kicks off in its mount effect before any assertions run.
  await act(async () => {
    await waitForMicrotaskFlush();
  });

  return { hookResultBox, renderer };
};

describe('useSavedRehearsalLibrary -> saveSource', () => {
  beforeEach(() => {
    installMemoryAsyncStorage();
  });

  afterEach(() => {
    restoreAsyncStorage();
  });

  it('calls the repository to persist a saved source and reflects it in hook state', async () => {
    const { hookResultBox, renderer } =
      await renderSavedRehearsalLibraryHook();

    let didSave = false;

    await act(async () => {
      didSave = (await hookResultBox.current?.saveSource(SAVED_SOURCE)) ?? false;
    });

    assert.equal(didSave, true);
    assert.deepEqual(
      hookResultBox.current?.savedSources.map((source) => source.id),
      [SAVED_SOURCE.id],
    );

    const persistedSources = await new AsyncStoragePracticeRepository().listSources(
      LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
    );

    assert.deepEqual(
      persistedSources.map((source) => source.id),
      [SAVED_SOURCE.id],
    );

    act(() => {
      renderer.unmount();
    });
  });

  it('persists edited tags and reflects them after the hook reloads from storage', async () => {
    const { hookResultBox, renderer } =
      await renderSavedRehearsalLibraryHook();

    await act(async () => {
      await hookResultBox.current?.saveSource(SAVED_SOURCE);
    });

    await act(async () => {
      await hookResultBox.current?.saveSource({
        ...SAVED_SOURCE,
        tags: NEW_TAGS,
      });
    });

    assert.deepEqual(
      hookResultBox.current?.savedSources.find(
        (source) => source.id === SAVED_SOURCE.id,
      )?.tags,
      NEW_TAGS,
    );

    act(() => {
      renderer.unmount();
    });

    // Reopening the tag editor reads from a fresh hook mount, matching what
    // the running app does when a user navigates away and back — the exact
    // scenario the audit found broken.
    const reopened = await renderSavedRehearsalLibraryHook();

    assert.deepEqual(
      reopened.hookResultBox.current?.savedSources.find(
        (source) => source.id === SAVED_SOURCE.id,
      )?.tags,
      NEW_TAGS,
    );

    act(() => {
      reopened.renderer.unmount();
    });
  });
});
