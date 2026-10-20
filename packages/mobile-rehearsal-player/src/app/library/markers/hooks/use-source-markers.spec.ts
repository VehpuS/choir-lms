/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';
import type { NamedLoop, TrackMarker } from '@org/audio-library-models';
import { createElement, useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useSavedRehearsalLibrary } from '../../saved-rehearsal-library/use-saved-rehearsal-library.js';
import { useSourceMarkers } from './use-source-markers.js';

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
const LOOP_ITEM = { id: 'loop-1', sourceId: TRACK.id };
const LOOP = {
  id: 'loop-1',
  name: 'Verse 2',
  sourceId: TRACK.id,
  startMs: 60_000,
  endMs: 90_000,
} as NamedLoop;

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const renderHarness = async () => {
  const box: {
    current: {
      library: ReturnType<typeof useSavedRehearsalLibrary>;
      markers: ReturnType<typeof useSourceMarkers>;
      setLoops: (loops: NamedLoop[]) => void;
    } | null;
  } = { current: null };
  const Harness = () => {
    const library = useSavedRehearsalLibrary();
    const [loops, setLoops] = useState<NamedLoop[]>([]);
    const markers = useSourceMarkers({
      canMutateLibrary: library.canMutateLibrary,
      refreshSources: library.refreshSources,
      savedLoops: loops,
      savedSources: library.savedSources,
    });

    box.current = { library, markers, setLoops };
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

describe('useSourceMarkers', () => {
  beforeEach(installMemoryAsyncStorage);
  afterEach(() => {
    mutableAsyncStorage.getItem = ORIGINAL_ASYNC_STORAGE.getItem;
    mutableAsyncStorage.removeItem = ORIGINAL_ASYNC_STORAGE.removeItem;
    mutableAsyncStorage.setItem = ORIGINAL_ASYNC_STORAGE.setItem;
  });

  it('adds, renames, moves, deletes and restores a marker, and persists it', async () => {
    const { box, renderer } = await renderHarness();
    let markerId = '';

    await act(async () => {
      const added = await box.current?.markers.addMarker(TRACK, {
        positionMs: 72_400,
      });

      markerId = added?.marker?.id ?? '';
    });
    assert.equal(
      box.current?.markers.markersFor(TRACK).explicit[0]?.name,
      'Marker 1',
    );

    await act(async () => {
      await box.current?.markers.renameMarker(TRACK, markerId, 'Bridge');
      await box.current?.markers.moveMarker(TRACK, markerId, 80_000);
    });
    const persisted = await new AsyncStoragePracticeRepository().listSources(
      'local-device-user',
    );
    assert.equal(persisted[0]?.markers?.[0]?.name, 'Bridge');
    assert.equal(persisted[0]?.markers?.[0]?.positionMs, 80_000);

    let removed: TrackMarker | undefined;

    await act(async () => {
      removed = (await box.current?.markers.deleteMarker(TRACK, markerId))
        ?.marker;
    });
    assert.deepEqual(box.current?.markers.markersFor(TRACK).explicit, []);

    await act(async () => {
      if (removed) {
        await box.current?.markers.restoreMarker(TRACK, removed);
      }
    });
    assert.equal(
      box.current?.markers.markersFor(TRACK).explicit[0]?.id,
      markerId,
    );

    act(() => renderer.unmount());
  });

  it('reads and edits the owning track from a loop', async () => {
    const { box, renderer } = await renderHarness();

    await act(async () => {
      await box.current?.markers.addMarker(LOOP_ITEM, { positionMs: 70_000 });
    });

    assert.equal(box.current?.markers.markersFor(TRACK).explicit.length, 1);
    assert.equal(
      box.current?.markers.markersFor(LOOP_ITEM).owner?.id,
      TRACK.id,
    );

    act(() => renderer.unmount());
  });

  it('derives loop markers that follow an edit and a delete of the loop', async () => {
    const { box, renderer } = await renderHarness();

    act(() => box.current?.setLoops([LOOP]));
    assert.deepEqual(
      box.current?.markers
        .markersFor(TRACK)
        .derived.map((m) => [m.name, m.positionMs]),
      [
        ['Verse 2 start', 60_000],
        ['Verse 2 end', 90_000],
      ],
    );

    act(() => box.current?.setLoops([{ ...LOOP, startMs: 65_000 }]));
    assert.equal(
      box.current?.markers.markersFor(TRACK).derived[0]?.positionMs,
      65_000,
    );

    act(() => box.current?.setLoops([]));
    assert.deepEqual(box.current?.markers.markersFor(TRACK).derived, []);

    act(() => renderer.unmount());
  });

  it('leaves out the loop being edited', async () => {
    const { box, renderer } = await renderHarness();

    act(() => box.current?.setLoops([LOOP]));
    assert.deepEqual(
      box.current?.markers.markersFor(TRACK, { excludeLoopId: LOOP.id })
        .derived,
      [],
    );

    act(() => renderer.unmount());
  });

  it('does nothing when the owning track is missing', async () => {
    const { box, renderer } = await renderHarness();
    const orphan = { id: 'loop-2', sourceId: 'gone' };
    let result: unknown;

    await act(async () => {
      result = await box.current?.markers.addMarker(orphan, { positionMs: 1 });
    });

    assert.deepEqual(result, { status: 'unavailable' });
    assert.equal(box.current?.markers.markersFor(orphan).owner, null);

    act(() => renderer.unmount());
  });
});
