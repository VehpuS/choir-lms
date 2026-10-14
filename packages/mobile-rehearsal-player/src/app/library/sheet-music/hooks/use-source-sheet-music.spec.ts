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
import { useSourceSheetMusic } from './use-source-sheet-music.js';

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
const SCORE = {
  format: 'pdf',
  label: 'Full score',
  location: { kind: 'url', url: 'https://example.com/score.pdf' },
} as const;

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const renderHarness = async () => {
  const box: {
    current: {
      library: ReturnType<typeof useSavedRehearsalLibrary>;
      sheetMusic: ReturnType<typeof useSourceSheetMusic>;
    } | null;
  } = { current: null };
  const Harness = () => {
    const library = useSavedRehearsalLibrary();
    const sheetMusic = useSourceSheetMusic({
      canMutateLibrary: library.canMutateLibrary,
      refreshSources: library.refreshSources,
      savedSources: library.savedSources,
    });

    box.current = { library, sheetMusic };
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

describe('useSourceSheetMusic', () => {
  beforeEach(installMemoryAsyncStorage);
  afterEach(() => {
    mutableAsyncStorage.getItem = ORIGINAL_ASYNC_STORAGE.getItem;
    mutableAsyncStorage.removeItem = ORIGINAL_ASYNC_STORAGE.removeItem;
    mutableAsyncStorage.setItem = ORIGINAL_ASYNC_STORAGE.setItem;
  });

  it('adds, renames, selects parts, and removes sources, and persists them', async () => {
    const { box, renderer } = await renderHarness();

    await act(async () => {
      await box.current?.sheetMusic.addSheetMusic(TRACK, SCORE);
    });
    const [added] =
      box.current?.sheetMusic.sheetMusicFor(TRACK).sheetMusic ?? [];

    assert.equal(added?.label, 'Full score');

    await act(async () => {
      await box.current?.sheetMusic.updateSheetMusic(TRACK, added?.id ?? '', {
        label: 'Alto part',
        partSelection: { include: ['Alto'] },
      });
    });
    const persisted = await new AsyncStoragePracticeRepository().listSources(
      'local-device-user',
    );

    assert.equal(persisted[0]?.sheetMusic?.[0]?.label, 'Alto part');
    assert.deepEqual(persisted[0]?.sheetMusic?.[0]?.partSelection, {
      include: ['Alto'],
    });

    await act(async () => {
      await box.current?.sheetMusic.removeSheetMusic(TRACK, added?.id ?? '');
    });
    assert.equal(
      box.current?.sheetMusic.sheetMusicFor(TRACK).sheetMusic.length,
      0,
    );

    act(() => renderer.unmount());
  });

  it('reads and edits the owning track from a loop', async () => {
    const { box, renderer } = await renderHarness();

    await act(async () => {
      await box.current?.sheetMusic.addSheetMusic(LOOP, SCORE);
    });

    assert.equal(
      box.current?.sheetMusic.sheetMusicFor(TRACK).sheetMusic.length,
      1,
    );
    assert.equal(
      box.current?.sheetMusic.sheetMusicFor(LOOP).sheetMusic.length,
      1,
    );
    assert.equal(
      box.current?.sheetMusic.sheetMusicFor(LOOP).owner?.id,
      TRACK.id,
    );

    act(() => renderer.unmount());
  });

  it('does nothing when the owning track is missing', async () => {
    const { box, renderer } = await renderHarness();
    const orphan = { id: 'loop-2', sourceId: 'gone' };
    let didAdd = true;

    await act(async () => {
      didAdd =
        (await box.current?.sheetMusic.addSheetMusic(orphan, SCORE)) ?? true;
    });

    assert.equal(didAdd, false);
    assert.equal(box.current?.sheetMusic.sheetMusicFor(orphan).owner, null);
    assert.equal(
      box.current?.sheetMusic.sheetMusicFor(orphan).sheetMusic.length,
      0,
    );

    act(() => renderer.unmount());
  });
});
