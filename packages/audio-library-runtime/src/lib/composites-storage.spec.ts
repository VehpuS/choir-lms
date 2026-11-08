import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  createCompositeTrack,
  createDriveAudioSource,
  type CompositeTrack,
} from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import {
  listStoredComposites,
  updateStoredComposites,
} from './composites-storage.js';
import { AsyncStoragePracticeRepository } from './rehearsal-playback.js';

const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;
const ORIGINAL = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};
const OWNER_ID = 'user-1';
const COMPOSITES_KEY = `choirlms:practice:composites:${OWNER_ID}`;
const SOURCES_KEY = `choirlms:practice:sources:${OWNER_ID}`;

const useMemoryStorage = (storage: Map<string, string>) => {
  mutableAsyncStorage.getItem = async (key) => storage.get(key) ?? null;
  mutableAsyncStorage.removeItem = async (key) => {
    storage.delete(key);
  };
  mutableAsyncStorage.setItem = async (key, value) => {
    storage.set(key, value);
  };
};

afterEach(() => {
  mutableAsyncStorage.getItem = ORIGINAL.getItem;
  mutableAsyncStorage.removeItem = ORIGINAL.removeItem;
  mutableAsyncStorage.setItem = ORIGINAL.setItem;
});

const composite = (id: string): CompositeTrack => {
  const made = createCompositeTrack({
    draft: {
      name: id,
      stems: [
        { trackId: 'a', name: 'Alto' },
        { trackId: 'b', name: 'Bass' },
      ],
    },
    createId: () => id,
    createdAt: '2026-11-08T10:00:00.000Z',
  });

  assert.ok(made);

  return made;
};

describe('composites storage', () => {
  it('reads nothing where the collection was never written', async () => {
    useMemoryStorage(new Map());

    assert.deepEqual(await listStoredComposites(OWNER_ID), []);
  });

  it('saves and reads composites, keeping their stems and settings', async () => {
    useMemoryStorage(new Map());

    await updateStoredComposites(OWNER_ID, () => [composite('c1')]);
    const [read] = await listStoredComposites(OWNER_ID);

    assert.deepEqual(read, composite('c1'));
  });

  it('gives a change the latest saved list, even when changes overlap', async () => {
    useMemoryStorage(new Map());

    await Promise.all([
      updateStoredComposites(OWNER_ID, (list) => [...list, composite('c1')]),
      updateStoredComposites(OWNER_ID, (list) => [...list, composite('c2')]),
      updateStoredComposites(OWNER_ID, (list) => [...list, composite('c3')]),
    ]);

    assert.deepEqual(
      (await listStoredComposites(OWNER_ID)).map((c) => c.id),
      ['c1', 'c2', 'c3'],
    );
  });

  it('drops a malformed record without losing the others', async () => {
    useMemoryStorage(
      new Map([
        [
          COMPOSITES_KEY,
          JSON.stringify([composite('c1'), { id: 'bad' }, 'junk', null]),
        ],
      ]),
    );

    assert.deepEqual(
      (await listStoredComposites(OWNER_ID)).map((c) => c.id),
      ['c1'],
    );
  });

  it('starts over from an unreadable collection', async () => {
    useMemoryStorage(new Map([[COMPOSITES_KEY, '{not json']]));

    assert.deepEqual(await listStoredComposites(OWNER_ID), []);
  });

  it('leaves the other collections alone, and a build without composites ignores the key', async () => {
    const source = createDriveAudioSource({
      driveFileId: 'd1',
      name: 'Track.mp3',
      mimeType: 'audio/mpeg',
      availability: { status: 'available' },
    });
    const storage = new Map([[SOURCES_KEY, JSON.stringify([source])]]);

    useMemoryStorage(storage);
    await updateStoredComposites(OWNER_ID, () => [composite('c1')]);

    const repository = new AsyncStoragePracticeRepository();

    assert.equal((await repository.listSources(OWNER_ID)).length, 1);
    assert.equal(storage.get(SOURCES_KEY), JSON.stringify([source]));
    assert.deepEqual(await repository.listPlaylists(OWNER_ID), []);
    assert.deepEqual(await repository.listLoops(OWNER_ID), []);
  });
});
