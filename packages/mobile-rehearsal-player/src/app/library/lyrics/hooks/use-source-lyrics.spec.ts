/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useSavedRehearsalLibrary } from '../../saved-rehearsal-library/use-saved-rehearsal-library.js';
import { useSourceLyrics } from './use-source-lyrics.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;
const ORIGINAL_ASYNC_STORAGE = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};

// The hook writes through a module-level repository singleton, so the
// underlying AsyncStorage functions are swapped for an in-memory store (the
// same approach use-saved-rehearsal-library.spec.ts uses).
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

const TRACK = {
  id: 'drive:kyrie',
  provider: 'google-drive' as const,
  driveFileId: 'kyrie',
  name: 'Kyrie.mp3',
  mimeType: 'audio/mpeg',
  createdAt: '2026-05-10T10:00:00.000Z',
  availability: { status: 'available' as const },
};
const LOOP = { id: 'loop-1', sourceId: TRACK.id };

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const renderHarness = async () => {
  const box: {
    current: {
      library: ReturnType<typeof useSavedRehearsalLibrary>;
      lyrics: ReturnType<typeof useSourceLyrics>;
    } | null;
  } = { current: null };
  const Harness = () => {
    const library = useSavedRehearsalLibrary();
    const lyrics = useSourceLyrics({
      canMutateLibrary: library.canMutateLibrary,
      refreshSources: library.refreshSources,
      savedSources: library.savedSources,
    });

    box.current = { library, lyrics };
    return null;
  };
  let renderer!: ReactTestRenderer;

  await act(async () => {
    renderer = create(createElement(Harness));
  });
  await act(async () => {
    await flush();
  });
  await act(async () => {
    await box.current?.library.saveSource(TRACK);
  });

  return { box, renderer };
};

describe('useSourceLyrics', () => {
  beforeEach(installMemoryAsyncStorage);
  afterEach(() => {
    mutableAsyncStorage.getItem = ORIGINAL_ASYNC_STORAGE.getItem;
    mutableAsyncStorage.removeItem = ORIGINAL_ASYNC_STORAGE.removeItem;
    mutableAsyncStorage.setItem = ORIGINAL_ASYNC_STORAGE.setItem;
  });

  it('saves, edits, and clears lyrics, and persists them', async () => {
    const { box, renderer } = await renderHarness();

    await act(async () => {
      await box.current?.lyrics.saveLyrics(TRACK, {
        origin: 'looked-up',
        text: 'Kyrie eleison',
      });
    });
    assert.equal(
      box.current?.lyrics.lyricsFor(TRACK).lyrics?.text,
      'Kyrie eleison',
    );
    assert.equal(
      box.current?.lyrics.lyricsFor(TRACK).lyrics?.origin,
      'looked-up',
    );

    await act(async () => {
      await box.current?.lyrics.saveLyrics(TRACK, {
        origin: 'typed',
        text: 'Christe eleison',
      });
    });
    const persisted = await new AsyncStoragePracticeRepository().listSources(
      'local-device-user',
    );
    assert.equal(persisted[0]?.lyrics?.text, 'Christe eleison');

    await act(async () => {
      await box.current?.lyrics.clearLyrics(TRACK);
    });
    assert.equal(box.current?.lyrics.lyricsFor(TRACK).lyrics, undefined);

    act(() => renderer.unmount());
  });

  it('reads and edits the owning track from a loop', async () => {
    const { box, renderer } = await renderHarness();

    await act(async () => {
      await box.current?.lyrics.saveLyrics(LOOP, {
        origin: 'typed',
        text: 'Shared words',
      });
    });

    assert.equal(
      box.current?.lyrics.lyricsFor(TRACK).lyrics?.text,
      'Shared words',
    );
    assert.equal(box.current?.lyrics.lyricsFor(LOOP).owner?.id, TRACK.id);

    act(() => renderer.unmount());
  });

  it('does nothing when the owning track is missing', async () => {
    const { box, renderer } = await renderHarness();
    let didSave = true;

    await act(async () => {
      didSave =
        (await box.current?.lyrics.saveLyrics(
          { id: 'loop-2', sourceId: 'gone' },
          { origin: 'typed', text: 'Orphan' },
        )) ?? true;
    });

    assert.equal(didSave, false);
    assert.equal(
      box.current?.lyrics.lyricsFor({ id: 'loop-2', sourceId: 'gone' }).owner,
      null,
    );

    act(() => renderer.unmount());
  });
});
