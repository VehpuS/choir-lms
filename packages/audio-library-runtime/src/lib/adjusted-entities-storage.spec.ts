import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  createAdjustedLoop,
  createAdjustedTrackSource,
  createDriveAudioSource,
} from '@org/audio-library-models';
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
const LOOPS_KEY = `choirlms:practice:loops:${OWNER_ID}`;
const SLOW_AND_LOW = {
  pitchSemitones: -2,
  speedMultiplier: 0.8,
  tempoSource: 'multiplier' as const,
};

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

describe('adjusted entities in the practice repository', () => {
  it('round-trips an adjusted track and an adjusted loop', async () => {
    useMemoryStorage(new Map());
    const repository = new AsyncStoragePracticeRepository();
    const adjustedTrack = createAdjustedTrackSource({
      source,
      transform: SLOW_AND_LOW,
    });
    const adjustedLoop = createAdjustedLoop({
      id: 'loop-1',
      name: 'Entrance • 0.80× −2 st',
      ownerId: OWNER_ID,
      source,
      startMs: 1000,
      endMs: 9000,
      transform: SLOW_AND_LOW,
    });

    await repository.saveSource(OWNER_ID, source);
    await repository.saveSource(OWNER_ID, adjustedTrack);
    await repository.saveLoop(adjustedLoop);

    const sources = await repository.listSources(OWNER_ID);
    const loops = await repository.listLoops(OWNER_ID);

    assert.deepEqual(
      sources.find(({ id }) => id === adjustedTrack.id)?.adjustment,
      { sourceRef: source.id, transform: SLOW_AND_LOW },
    );
    assert.deepEqual(loops[0]?.transform, SLOW_AND_LOW);
    // Both entities get a Library file link like any saved track or loop.
    const tree = await repository.listLibraryFileTree(OWNER_ID);

    assert.ok(
      tree.fileLinks.some((link) => link.entityId === adjustedTrack.id),
    );
    assert.ok(tree.fileLinks.some((link) => link.entityId === 'loop-1'));
  });

  it('reads a library saved before adjusted entities existed unchanged', async () => {
    const storage = new Map([
      [SOURCES_KEY, JSON.stringify([source])],
      [
        LOOPS_KEY,
        JSON.stringify([
          {
            id: 'loop-1',
            name: 'Verse',
            sourceId: source.id,
            sourceName: source.name,
            startMs: 0,
            endMs: 5000,
            ownerId: OWNER_ID,
            createdAt: '2026-05-10T00:00:00.000Z',
            updatedAt: '2026-05-10T00:00:00.000Z',
          },
        ]),
      ],
    ]);

    useMemoryStorage(storage);
    const repository = new AsyncStoragePracticeRepository();
    const [storedSource] = await repository.listSources(OWNER_ID);
    const [storedLoop] = await repository.listLoops(OWNER_ID);

    assert.equal(storedSource?.adjustment, undefined);
    assert.equal(storedLoop?.transform, undefined);
  });

  it('repairs or drops unreadable adjustment data on read', async () => {
    const adjustedTrack = createAdjustedTrackSource({
      source,
      transform: SLOW_AND_LOW,
    });
    const storage = new Map([
      [
        SOURCES_KEY,
        JSON.stringify([
          source,
          {
            ...adjustedTrack,
            adjustment: {
              sourceRef: source.id,
              transform: { speedMultiplier: 9, pitchSemitones: 0 },
            },
          },
          { ...adjustedTrack, id: 'adjusted:broken', adjustment: 'nope' },
        ]),
      ],
      [
        LOOPS_KEY,
        JSON.stringify([
          {
            ...createAdjustedLoop({
              id: 'loop-1',
              name: 'Verse',
              ownerId: OWNER_ID,
              source,
              startMs: 0,
              endMs: 5000,
              transform: SLOW_AND_LOW,
            }),
            transform: { speedMultiplier: 'fast' },
          },
        ]),
      ],
    ]);

    useMemoryStorage(storage);
    const repository = new AsyncStoragePracticeRepository();
    const sources = await repository.listSources(OWNER_ID);
    const [loop] = await repository.listLoops(OWNER_ID);

    assert.deepEqual(
      sources.map(({ id }) => id).sort(),
      [adjustedTrack.id, source.id].sort(),
    );
    assert.equal(
      sources.find(({ id }) => id === adjustedTrack.id)?.adjustment?.transform
        .speedMultiplier,
      2,
    );
    assert.equal(loop?.transform, undefined);
  });

  it('removes adjusted tracks and loops with their source', async () => {
    useMemoryStorage(new Map());
    const repository = new AsyncStoragePracticeRepository();
    const adjustedTrack = createAdjustedTrackSource({
      source,
      transform: SLOW_AND_LOW,
    });

    await repository.saveSource(OWNER_ID, source);
    await repository.saveSource(OWNER_ID, adjustedTrack);
    await repository.saveLoop(
      createAdjustedLoop({
        id: 'loop-1',
        name: 'Verse',
        ownerId: OWNER_ID,
        source,
        startMs: 0,
        endMs: 5000,
        transform: SLOW_AND_LOW,
      }),
    );

    const remainingSources = await repository.deleteSource(OWNER_ID, source.id);

    assert.deepEqual(remainingSources, []);
    assert.deepEqual(await repository.listLoops(OWNER_ID), []);
  });

  it('keeps the source when only its adjusted track is deleted', async () => {
    useMemoryStorage(new Map());
    const repository = new AsyncStoragePracticeRepository();
    const adjustedTrack = createAdjustedTrackSource({
      source,
      transform: SLOW_AND_LOW,
    });

    await repository.saveSource(OWNER_ID, source);
    await repository.saveSource(OWNER_ID, adjustedTrack);

    const remainingSources = await repository.deleteSource(
      OWNER_ID,
      adjustedTrack.id,
    );

    assert.deepEqual(
      remainingSources.map(({ id }) => id),
      [source.id],
    );
  });
});
