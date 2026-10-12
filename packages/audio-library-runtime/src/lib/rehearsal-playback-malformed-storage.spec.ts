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

const AVAILABLE_SOURCE = createDriveAudioSource({
  driveFileId: 'drive-file-1',
  name: 'Full Choir.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 240000,
  availability: {
    status: 'available',
  },
});

afterEach(() => {
  mutableAsyncStorage.getItem = ORIGINAL_ASYNC_STORAGE.getItem;
  mutableAsyncStorage.removeItem = ORIGINAL_ASYNC_STORAGE.removeItem;
  mutableAsyncStorage.setItem = ORIGINAL_ASYNC_STORAGE.setItem;
});

describe('AsyncStoragePracticeRepository malformed storage', () => {
  it('drops malformed saved-source storage and treats it as empty', async () => {
    const storage = new Map<string, string>([
      ['choirlms:practice:sources:user-1', '{not-json'],
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

    assert.deepEqual(await repository.listSources('user-1'), []);
    assert.equal(storage.has('choirlms:practice:sources:user-1'), false);

    await repository.saveSource('user-1', AVAILABLE_SOURCE);

    assert.deepEqual(
      (await repository.listSources('user-1')).map((source) => source.name),
      ['Full Choir.mp3'],
    );
  });
});
