import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type NamedLoop,
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

const AVAILABLE_SOURCE = createDriveAudioSource({
  driveFileId: 'drive-file-1',
  name: 'Full Choir.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 240000,
  availability: {
    status: 'available',
  },
});

const SAVED_LOOP: NamedLoop = {
  id: 'loop-1',
  name: 'Verse entrance',
  sourceId: AVAILABLE_SOURCE.id,
  sourceName: AVAILABLE_SOURCE.name,
  startMs: 12000,
  endMs: 24000,
  ownershipScope: 'user',
  ownerId: 'user-1',
  createdAt: '2026-05-10T00:00:00.000Z',
  updatedAt: '2026-05-10T00:00:00.000Z',
};

afterEach(() => {
  mutableAsyncStorage.getItem = ORIGINAL_ASYNC_STORAGE.getItem;
  mutableAsyncStorage.removeItem = ORIGINAL_ASYNC_STORAGE.removeItem;
  mutableAsyncStorage.setItem = ORIGINAL_ASYNC_STORAGE.setItem;
});

describe('AsyncStoragePracticeRepository loop parent-track provenance', () => {
  it('repairs or preserves loop parent-track provenance when loops are read back from storage', async () => {
    const storage = new Map<string, string>([
      [
        'choirlms:practice:sources:user-1',
        JSON.stringify([
          {
            ...AVAILABLE_SOURCE,
            name: 'Full Choir updated.mp3',
          },
        ]),
      ],
      [
        'choirlms:practice:loops:user-1',
        JSON.stringify([
          {
            ...SAVED_LOOP,
            sourceName: 'Full Choir.mp3',
          },
          {
            ...SAVED_LOOP,
            id: 'loop-2',
            name: 'Missing source loop',
            sourceId: 'drive:missing-source',
            sourceName: 'Archived Track.mp3',
          },
          {
            ...SAVED_LOOP,
            id: 'loop-3',
            name: 'Missing provenance loop',
            sourceId: 'drive:missing-source',
            sourceName: '',
          },
        ]),
      ],
    ]);
    const repository = new AsyncStoragePracticeRepository();

    mutableAsyncStorage.getItem = async (key) => {
      return storage.get(key) ?? null;
    };
    mutableAsyncStorage.removeItem = async (key) => {
      storage.delete(key);
    };
    mutableAsyncStorage.setItem = async (key, value) => {
      storage.set(key, value);
    };

    assert.deepEqual(await repository.listLoops('user-1'), [
      {
        ...SAVED_LOOP,
        sourceName: 'Full Choir updated.mp3',
      },
      {
        ...SAVED_LOOP,
        id: 'loop-2',
        name: 'Missing source loop',
        sourceId: 'drive:missing-source',
        sourceName: 'Archived Track.mp3',
      },
    ]);
    assert.equal(
      storage.get('choirlms:practice:loops:user-1'),
      JSON.stringify([
        {
          ...SAVED_LOOP,
          sourceName: 'Full Choir updated.mp3',
        },
        {
          ...SAVED_LOOP,
          id: 'loop-2',
          name: 'Missing source loop',
          sourceId: 'drive:missing-source',
          sourceName: 'Archived Track.mp3',
        },
      ]),
    );
  });
});
