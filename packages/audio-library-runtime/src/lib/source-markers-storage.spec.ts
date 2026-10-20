import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import { AsyncStoragePracticeRepository } from './rehearsal-playback.js';

const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;

const ORIGINAL_ASYNC_STORAGE = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};

const OWNER_ID = 'user-1';
const SOURCES_KEY = `choirlms:practice:sources:${OWNER_ID}`;

const source = createDriveAudioSource({
  driveFileId: 'drive-file-1',
  name: 'Full Choir.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 240000,
  availability: { status: 'available' },
});

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
  mutableAsyncStorage.getItem = ORIGINAL_ASYNC_STORAGE.getItem;
  mutableAsyncStorage.removeItem = ORIGINAL_ASYNC_STORAGE.removeItem;
  mutableAsyncStorage.setItem = ORIGINAL_ASYNC_STORAGE.setItem;
});

const readMarkers = async (repository: AsyncStoragePracticeRepository) => {
  const sources = await repository.listSources(OWNER_ID);

  return sources.find(({ id }) => id === source.id)?.markers;
};

const setUp = async () => {
  useMemoryStorage(new Map());
  const repository = new AsyncStoragePracticeRepository();

  await repository.saveSource(OWNER_ID, source);

  return repository;
};

describe('track markers in the practice repository', () => {
  it('adds a marker with an automatic name and round-trips it', async () => {
    const repository = await setUp();

    const result = await repository.addMarker(OWNER_ID, source.id, {
      positionMs: 72_400,
    });

    assert.equal(result.status, 'ok');
    assert.equal(result.marker?.name, 'Marker 1');
    assert.deepEqual(
      (await readMarkers(repository))?.map(({ name, positionMs }) => ({
        name,
        positionMs,
      })),
      [{ name: 'Marker 1', positionMs: 72_400 }],
    );
  });

  it('fills the gap in automatic names', async () => {
    const repository = await setUp();

    await repository.addMarker(OWNER_ID, source.id, { positionMs: 1 });
    await repository.addMarker(OWNER_ID, source.id, { positionMs: 2 });
    await repository.addMarker(OWNER_ID, source.id, { positionMs: 3 });
    const second = (await readMarkers(repository))?.[1];
    await repository.deleteMarker(OWNER_ID, source.id, second?.id ?? '');
    const added = await repository.addMarker(OWNER_ID, source.id, {
      positionMs: 4,
    });

    assert.equal(added.marker?.name, 'Marker 2');
  });

  it('keeps the list ordered by position after a move', async () => {
    const repository = await setUp();
    const first = await repository.addMarker(OWNER_ID, source.id, {
      positionMs: 1_000,
      name: 'A',
    });

    await repository.addMarker(OWNER_ID, source.id, {
      positionMs: 2_000,
      name: 'B',
    });
    await repository.moveMarker(
      OWNER_ID,
      source.id,
      first.marker?.id ?? '',
      3_000,
    );

    assert.deepEqual(
      (await readMarkers(repository))?.map(({ name }) => name),
      ['B', 'A'],
    );
  });

  it('clamps a move to the track length', async () => {
    const repository = await setUp();
    const added = await repository.addMarker(OWNER_ID, source.id, {
      positionMs: 1_000,
    });

    await repository.moveMarker(
      OWNER_ID,
      source.id,
      added.marker?.id ?? '',
      9_999_999,
    );

    assert.equal((await readMarkers(repository))?.[0]?.positionMs, 240_000);
  });

  it('refuses a negative position on add and move', async () => {
    const repository = await setUp();
    const refusedAdd = await repository.addMarker(OWNER_ID, source.id, {
      positionMs: -5,
    });
    const added = await repository.addMarker(OWNER_ID, source.id, {
      positionMs: 10,
    });
    const refusedMove = await repository.moveMarker(
      OWNER_ID,
      source.id,
      added.marker?.id ?? '',
      Number.NaN,
    );

    assert.equal(refusedAdd.status, 'invalid-position');
    assert.equal(refusedMove.status, 'invalid-position');
    assert.equal((await readMarkers(repository))?.[0]?.positionMs, 10);
  });

  it('renames a marker and refuses an empty name', async () => {
    const repository = await setUp();
    const added = await repository.addMarker(OWNER_ID, source.id, {
      positionMs: 10,
    });
    const id = added.marker?.id ?? '';

    const renamed = await repository.renameMarker(
      OWNER_ID,
      source.id,
      id,
      '  Bridge ',
    );
    const refused = await repository.renameMarker(
      OWNER_ID,
      source.id,
      id,
      '   ',
    );

    assert.equal(renamed.status, 'ok');
    assert.equal(refused.status, 'invalid-name');
    assert.equal((await readMarkers(repository))?.[0]?.name, 'Bridge');
    assert.equal((await readMarkers(repository))?.[0]?.positionMs, 10);
  });

  it('deletes a marker, removes the field when empty, and restores it for undo', async () => {
    const repository = await setUp();
    const added = await repository.addMarker(OWNER_ID, source.id, {
      positionMs: 10,
      name: 'Keep',
    });
    const removed = await repository.deleteMarker(
      OWNER_ID,
      source.id,
      added.marker?.id ?? '',
    );

    assert.equal(await readMarkers(repository), undefined);

    await repository.addMarker(OWNER_ID, source.id, {
      positionMs: removed.marker?.positionMs ?? 0,
      name: removed.marker?.name,
      id: removed.marker?.id,
      createdAt: removed.marker?.createdAt,
    });

    assert.deepEqual((await readMarkers(repository))?.[0], added.marker);
  });

  it('reports an unknown track or marker without writing', async () => {
    const repository = await setUp();

    assert.equal(
      (await repository.addMarker(OWNER_ID, 'gone', { positionMs: 1 })).status,
      'not-found',
    );
    assert.equal(
      (await repository.deleteMarker(OWNER_ID, source.id, 'nope')).status,
      'marker-not-found',
    );
    assert.equal(await readMarkers(repository), undefined);
  });

  it('refuses the 201st marker', async () => {
    const repository = await setUp();

    for (let index = 0; index < 200; index += 1) {
      await repository.addMarker(OWNER_ID, source.id, { positionMs: index });
    }
    const refused = await repository.addMarker(OWNER_ID, source.id, {
      positionMs: 500,
    });

    assert.equal(refused.status, 'limit-reached');
    assert.equal((await readMarkers(repository))?.length, 200);
  });

  it('updates only the markers field', async () => {
    const repository = await setUp();
    const before = (await repository.listSources(OWNER_ID))[0];

    await repository.addMarker(OWNER_ID, source.id, { positionMs: 10 });

    const { markers, ...rest } =
      (await repository.listSources(OWNER_ID))[0] ?? {};

    assert.equal(markers?.length, 1);
    assert.deepEqual(rest, before);
  });

  it('keeps markers when the track is saved again without them', async () => {
    const repository = await setUp();

    await repository.addMarker(OWNER_ID, source.id, { positionMs: 10 });
    await repository.saveSource(OWNER_ID, { ...source, name: 'Renamed.mp3' });

    assert.equal((await readMarkers(repository))?.length, 1);
  });

  it('loads an old record, repairs a bad marker, and drops the rest', async () => {
    const stored = {
      ...source,
      markers: [
        {
          id: 'ok',
          name: 'Good',
          positionMs: 5,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'bad',
          name: 'Negative',
          positionMs: -1,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    useMemoryStorage(
      new Map([
        [
          SOURCES_KEY,
          JSON.stringify([
            stored,
            { ...source, id: 'old', driveFileId: 'old' },
          ]),
        ],
      ]),
    );
    const sources = await new AsyncStoragePracticeRepository().listSources(
      OWNER_ID,
    );

    assert.deepEqual(
      sources.find(({ id }) => id === source.id)?.markers?.map(({ id }) => id),
      ['ok'],
    );
    assert.equal(sources.find(({ id }) => id === 'old')?.markers, undefined);
  });

  it('removes markers with the track', async () => {
    const repository = await setUp();

    await repository.addMarker(OWNER_ID, source.id, { positionMs: 10 });
    await repository.deleteSource(OWNER_ID, source.id);

    assert.deepEqual(await repository.listSources(OWNER_ID), []);
  });
});
