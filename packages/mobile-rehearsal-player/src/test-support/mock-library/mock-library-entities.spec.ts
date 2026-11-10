import {
  AsyncStoragePracticeRepository,
  listStoredComposites,
} from '@org/audio-library-runtime';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { createRecordingsStore } from '../../app/library/recording/recordings-store';
import { createMemoryRecordingsBackend } from '../../app/library/recording/recordings-test-support';
import {
  buildMockComposite,
  buildMockLoop,
  buildMockLyrics,
  buildMockMarker,
  buildMockRecording,
  withMockPlaylistItems,
  withMockTags,
} from './mock-library-entities';
import {
  buildMockLibraryStorageEntries,
  buildMockPlaylist,
  buildMockSource,
  MOCK_LIBRARY_OWNER_ID,
} from './mock-library-fixtures';

const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;
const ORIGINAL_ASYNC_STORAGE = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};

// The runtime reads through AsyncStorage, so it is swapped for an in-memory
// store seeded with exactly what the browser session would put in localStorage.
const seedMemoryAsyncStorage = (entries: Record<string, string>) => {
  const store = new Map(Object.entries(entries));

  mutableAsyncStorage.getItem = async (key) => store.get(key) ?? null;
  mutableAsyncStorage.removeItem = async (key) => {
    store.delete(key);
  };
  mutableAsyncStorage.setItem = async (key, value) => {
    store.set(key, value);
  };
};

const alto = withMockTags(
  buildMockSource('Alto Part', {
    lyrics: buildMockLyrics('Kyrie eleison'),
    markers: [
      buildMockMarker('Verse', 12_000),
      buildMockMarker('Chorus', 45_000),
    ],
  }),
  ['Mass', 'Easy'],
);
const tenor = buildMockSource('Tenor Part');
const loop = withMockTags(buildMockLoop(alto, 'Tricky bars'), ['Hard']);
const warmups = withMockPlaylistItems(buildMockPlaylist('Warmups'), [
  { source: alto },
  { loop, source: alto },
]);
const composite = buildMockComposite('Kyrie mix', [
  { source: alto, name: 'Alto' },
  { mine: true, source: tenor, name: 'Tenor' },
]);

describe('mock library entity builders', () => {
  beforeEach(() => {
    seedMemoryAsyncStorage(
      buildMockLibraryStorageEntries({
        composites: [composite],
        loops: [loop],
        playlists: [warmups],
        sources: [alto, tenor],
      }),
    );
  });

  afterEach(() => {
    Object.assign(mutableAsyncStorage, ORIGINAL_ASYNC_STORAGE);
  });

  it('keeps tags, markers and lyrics on a track through the runtime reader', async () => {
    const sources = await new AsyncStoragePracticeRepository().listSources(
      MOCK_LIBRARY_OWNER_ID,
    );
    const read = sources.find(({ id }) => id === alto.id);

    assert.deepEqual(read?.tags, ['Mass', 'Easy']);
    assert.deepEqual(
      read?.markers?.map(({ name, positionMs }) => [name, positionMs]),
      [
        ['Verse', 12_000],
        ['Chorus', 45_000],
      ],
    );
    assert.equal(read?.lyrics?.text, 'Kyrie eleison');
  });

  it('keeps a loop with its range and tags', async () => {
    const loops = await new AsyncStoragePracticeRepository().listLoops(
      MOCK_LIBRARY_OWNER_ID,
    );

    assert.equal(loops.length, 1);
    assert.equal(loops[0]?.name, 'Tricky bars');
    assert.equal(loops[0]?.startMs, 10_000);
    assert.equal(loops[0]?.endMs, 20_000);
    assert.deepEqual(loops[0]?.tags, ['Hard']);
  });

  it('keeps playlist entries for a track and a loop, in order', async () => {
    const playlists = await new AsyncStoragePracticeRepository().listPlaylists(
      MOCK_LIBRARY_OWNER_ID,
    );

    assert.deepEqual(
      playlists[0]?.items.map(({ kind, title }) => [kind, title]),
      [
        ['track', 'Alto Part'],
        ['loop', 'Tricky bars'],
      ],
    );
  });

  it('keeps a composite through the real composite parser', async () => {
    const composites = await listStoredComposites(MOCK_LIBRARY_OWNER_ID);

    assert.equal(composites.length, 1);
    assert.deepEqual(
      composites[0]?.stems.map(({ name, mine }) => [name, mine]),
      [
        ['Alto', false],
        ['Tenor', true],
      ],
    );
  });

  it('lists a built recording under its track in the recordings store', async () => {
    const { backend } = createMemoryRecordingsBackend();
    const recording = buildMockRecording(alto);

    await backend.putRecord(recording);

    const store = createRecordingsStore(backend);

    assert.equal((await store.list()).length, 1);
    assert.equal(
      (await store.listByOwner({ kind: 'track', id: alto.id })).length,
      1,
    );
  });
});
