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

const storedEntry = {
  id: 'sm-1',
  label: 'Full score',
  location: { kind: 'url', url: 'https://example.com/score.pdf' },
  format: 'pdf',
  addedAt: '2026-01-01T00:00:00.000Z',
};

const useStoredSources = (stored: unknown[]) => {
  const storage = new Map([[SOURCES_KEY, JSON.stringify(stored)]]);

  mutableAsyncStorage.getItem = async (key) => storage.get(key) ?? null;
  mutableAsyncStorage.setItem = async (key, value) => {
    storage.set(key, value);
  };
};

afterEach(() => {
  mutableAsyncStorage.getItem = ORIGINAL_ASYNC_STORAGE.getItem;
  mutableAsyncStorage.removeItem = ORIGINAL_ASYNC_STORAGE.removeItem;
  mutableAsyncStorage.setItem = ORIGINAL_ASYNC_STORAGE.setItem;
});

describe('sheet music when a track is read from storage', () => {
  it('reads stored sheet music and drops malformed entries', async () => {
    useStoredSources([
      { ...source, sheetMusic: [storedEntry, { id: 'bad', format: 'docx' }] },
    ]);

    const [read] = await new AsyncStoragePracticeRepository().listSources(
      OWNER_ID,
    );

    assert.deepEqual(read?.sheetMusic, [storedEntry]);
  });

  it('loads an old record without the field and drops a non-list value', async () => {
    useStoredSources([
      source,
      { ...source, id: 'other', sheetMusic: 'not a list' },
    ]);

    const sources = await new AsyncStoragePracticeRepository().listSources(
      OWNER_ID,
    );

    assert.equal(sources.length, 2);
    assert.ok(sources.every((read) => !('sheetMusic' in read)));
  });
});
