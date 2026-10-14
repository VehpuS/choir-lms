import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  MAX_SHEET_MUSIC_SOURCES,
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

const storedEntry = {
  id: 'sm-1',
  label: 'Full score',
  location: { kind: 'url', url: 'https://example.com/score.pdf' },
  format: 'pdf',
  addedAt: '2026-01-01T00:00:00.000Z',
};

const useMemoryStorage = (storage: Map<string, string>) => {
  mutableAsyncStorage.getItem = async (key) => storage.get(key) ?? null;
  mutableAsyncStorage.removeItem = async (key) => {
    storage.delete(key);
  };
  mutableAsyncStorage.setItem = async (key, value) => {
    storage.set(key, value);
  };
};

const useStoredSources = (stored: unknown[]) => {
  useMemoryStorage(new Map([[SOURCES_KEY, JSON.stringify(stored)]]));
};

const scoreAddition = {
  format: 'pdf',
  label: 'Full score',
  location: { kind: 'url', url: 'https://example.com/score.pdf' },
} as const;

const readSheetMusic = async (repository: AsyncStoragePracticeRepository) => {
  return (await repository.listSources(OWNER_ID))[0]?.sheetMusic;
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

describe('sheet music in the practice repository', () => {
  const setUp = async () => {
    useMemoryStorage(new Map());
    const repository = new AsyncStoragePracticeRepository();

    await repository.saveSource(OWNER_ID, source);

    return repository;
  };

  it('adds sources in order with their own id and timestamp', async () => {
    const repository = await setUp();

    await repository.addSheetMusicSource(OWNER_ID, source.id, scoreAddition);
    await repository.addSheetMusicSource(OWNER_ID, source.id, {
      ...scoreAddition,
      label: 'Alto part',
    });

    const sheetMusic = await readSheetMusic(repository);

    assert.deepEqual(
      sheetMusic?.map(({ label }) => label),
      ['Full score', 'Alto part'],
    );
    assert.notEqual(sheetMusic?.[0]?.id, sheetMusic?.[1]?.id);
    assert.ok(sheetMusic?.[0]?.addedAt);
  });

  it('renames a source and saves or resets its part selection', async () => {
    const repository = await setUp();

    await repository.addSheetMusicSource(OWNER_ID, source.id, scoreAddition);
    const id = (await readSheetMusic(repository))?.[0]?.id ?? '';

    await repository.updateSheetMusicSource(OWNER_ID, source.id, id, {
      label: '  Alto   part ',
      partSelection: { include: ['Alto'] },
    });
    let entry = (await readSheetMusic(repository))?.[0];
    assert.equal(entry?.label, 'Alto part');
    assert.deepEqual(entry?.partSelection, { include: ['Alto'] });

    // A blank label keeps the old name; null resets the selection.
    await repository.updateSheetMusicSource(OWNER_ID, source.id, id, {
      label: '   ',
      partSelection: null,
    });
    entry = (await readSheetMusic(repository))?.[0];
    assert.equal(entry?.label, 'Alto part');
    assert.equal(entry?.partSelection, undefined);
  });

  it('removes a source and the field once the list is empty', async () => {
    const repository = await setUp();

    await repository.addSheetMusicSource(OWNER_ID, source.id, scoreAddition);
    const id = (await readSheetMusic(repository))?.[0]?.id ?? '';
    await repository.removeSheetMusicSource(OWNER_ID, source.id, id);

    assert.equal(await readSheetMusic(repository), undefined);
  });

  it('touches only the sheet music field', async () => {
    const repository = await setUp();

    await repository.addSheetMusicSource(OWNER_ID, source.id, scoreAddition);

    const saved = (await repository.listSources(OWNER_ID))[0];

    assert.equal(saved?.name, source.name);
    assert.equal(saved?.driveFileId, source.driveFileId);
  });

  it('ignores an invalid addition, an unknown track, and anything past the limit', async () => {
    const repository = await setUp();

    await repository.addSheetMusicSource(OWNER_ID, source.id, {
      ...scoreAddition,
      location: { kind: 'url', url: 'ftp://example.com/score.pdf' },
    });
    await repository.addSheetMusicSource(OWNER_ID, 'missing', scoreAddition);
    assert.equal(await readSheetMusic(repository), undefined);

    for (let index = 0; index < MAX_SHEET_MUSIC_SOURCES + 2; index += 1) {
      await repository.addSheetMusicSource(OWNER_ID, source.id, scoreAddition);
    }

    assert.equal(
      (await readSheetMusic(repository))?.length,
      MAX_SHEET_MUSIC_SOURCES,
    );
  });

  it('keeps sheet music when the track is saved again without it', async () => {
    const repository = await setUp();

    await repository.addSheetMusicSource(OWNER_ID, source.id, scoreAddition);
    await repository.saveSource(OWNER_ID, { ...source, name: 'Renamed.mp3' });

    assert.equal((await readSheetMusic(repository))?.length, 1);
  });

  it('removes sheet music with the track and never copies it to an adjusted track', async () => {
    const repository = await setUp();

    await repository.addSheetMusicSource(OWNER_ID, source.id, scoreAddition);
    const withSheetMusic = (await repository.listSources(OWNER_ID))[0];

    assert.ok(withSheetMusic);
    await repository.saveSource(
      OWNER_ID,
      createAdjustedTrackSource({
        source: withSheetMusic,
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

    assert.equal(adjusted?.sheetMusic, undefined);
    assert.deepEqual(await repository.deleteSource(OWNER_ID, source.id), []);
  });
});
