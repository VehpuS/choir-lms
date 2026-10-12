import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
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

const readLyrics = async (repository: AsyncStoragePracticeRepository) => {
  const sources = await repository.listSources(OWNER_ID);

  return sources.find(({ id }) => id === source.id)?.lyrics;
};

describe('track lyrics in the practice repository', () => {
  it('round-trips saved lyrics and normalizes them', async () => {
    useMemoryStorage(new Map());
    const repository = new AsyncStoragePracticeRepository();

    await repository.saveSource(OWNER_ID, source);
    await repository.saveSourceLyrics(OWNER_ID, source.id, {
      origin: 'typed',
      text: 'Kyrie  \r\neleison\n\n\n\nChriste',
    });

    const lyrics = await readLyrics(repository);

    assert.equal(lyrics?.text, 'Kyrie\neleison\n\nChriste');
    assert.equal(lyrics?.origin, 'typed');
  });

  it('replaces edited lyrics and leaves the rest of the track alone', async () => {
    useMemoryStorage(new Map());
    const repository = new AsyncStoragePracticeRepository();

    await repository.saveSource(OWNER_ID, source);
    await repository.saveSourceLyrics(OWNER_ID, source.id, {
      origin: 'looked-up',
      text: 'First',
    });
    await repository.saveSourceLyrics(OWNER_ID, source.id, {
      origin: 'typed',
      text: 'Second',
    });

    const saved = (await repository.listSources(OWNER_ID))[0];

    assert.equal(saved?.lyrics?.text, 'Second');
    assert.equal(saved?.lyrics?.origin, 'typed');
    assert.equal(saved?.name, source.name);
    assert.equal(saved?.driveFileId, source.driveFileId);
  });

  it('removes the field when the body is empty or cleared', async () => {
    useMemoryStorage(new Map());
    const repository = new AsyncStoragePracticeRepository();

    await repository.saveSource(OWNER_ID, source);
    await repository.saveSourceLyrics(OWNER_ID, source.id, {
      origin: 'typed',
      text: 'Words',
    });
    await repository.saveSourceLyrics(OWNER_ID, source.id, {
      origin: 'typed',
      text: '  \n ',
    });
    assert.equal(await readLyrics(repository), undefined);

    await repository.saveSourceLyrics(OWNER_ID, source.id, {
      origin: 'typed',
      text: 'Words',
    });
    await repository.clearSourceLyrics(OWNER_ID, source.id);
    assert.equal(await readLyrics(repository), undefined);
  });

  it('keeps lyrics when the track is saved again without them', async () => {
    useMemoryStorage(new Map());
    const repository = new AsyncStoragePracticeRepository();

    await repository.saveSource(OWNER_ID, source);
    await repository.saveSourceLyrics(OWNER_ID, source.id, {
      origin: 'typed',
      text: 'Words',
    });
    await repository.saveSource(OWNER_ID, { ...source, name: 'Renamed.mp3' });

    assert.equal(
      (await repository.listSources(OWNER_ID))[0]?.lyrics?.text,
      'Words',
    );
  });

  it('loads an old record without the field and drops a malformed one', async () => {
    const storage = new Map([
      [
        SOURCES_KEY,
        JSON.stringify([source, { ...source, id: 'bad', lyrics: 7 }]),
      ],
    ]);
    useMemoryStorage(storage);
    const repository = new AsyncStoragePracticeRepository();
    const sources = await repository.listSources(OWNER_ID);

    assert.equal(sources.length, 2);
    assert.ok(sources.every(({ lyrics }) => lyrics === undefined));
  });

  it('ignores an unknown track id', async () => {
    useMemoryStorage(new Map());
    const repository = new AsyncStoragePracticeRepository();

    await repository.saveSource(OWNER_ID, source);
    await repository.saveSourceLyrics(OWNER_ID, 'missing', {
      origin: 'typed',
      text: 'Words',
    });

    assert.equal(await readLyrics(repository), undefined);
  });

  it('removes lyrics with the track and keeps an adjusted track copy-free', async () => {
    useMemoryStorage(new Map());
    const repository = new AsyncStoragePracticeRepository();

    await repository.saveSource(OWNER_ID, source);
    await repository.saveSourceLyrics(OWNER_ID, source.id, {
      origin: 'typed',
      text: 'Words',
    });
    const withLyrics = (await repository.listSources(OWNER_ID))[0];

    assert.ok(withLyrics);
    await repository.saveSource(
      OWNER_ID,
      createAdjustedTrackSource({
        source: withLyrics,
        transform: {
          pitchSemitones: -2,
          speedMultiplier: 0.8,
          tempoSource: 'multiplier',
        },
      }),
    );

    const adjusted = (await repository.listSources(OWNER_ID)).find(
      ({ adjustment }) => adjustment,
    );

    assert.equal(adjusted?.lyrics, undefined);
    assert.deepEqual(await repository.deleteSource(OWNER_ID, source.id), []);
  });
});
