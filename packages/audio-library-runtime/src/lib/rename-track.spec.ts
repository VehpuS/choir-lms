import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import { REHEARSAL_LIBRARY_ROOT_FOLDER_ID } from './rehearsal-library-files';
import { listTrackCopies } from './rename-track';
import { AsyncStoragePracticeRepository } from './rehearsal-playback.js';

const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;
const ORIGINAL_ASYNC_STORAGE = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};
const OWNER_ID = 'user-1';
const ROOT_FOLDER_ID = REHEARSAL_LIBRARY_ROOT_FOLDER_ID;

const useMemoryStorage = () => {
  const storage = new Map<string, string>();

  mutableAsyncStorage.getItem = async (key) => storage.get(key) ?? null;
  mutableAsyncStorage.removeItem = async (key) => {
    storage.delete(key);
  };
  mutableAsyncStorage.setItem = async (key, value) => {
    storage.set(key, value);
  };
};

afterEach(() => {
  Object.assign(mutableAsyncStorage, ORIGINAL_ASYNC_STORAGE);
});

const buildSource = (name: string, driveFileId: string) =>
  createDriveAudioSource({
    driveFileId,
    name,
    mimeType: 'audio/mpeg',
    durationMs: 1000,
    availability: { status: 'available' },
  });

// A library holding "Alto" with the given number of extra copies, each in its
// own folder, named as the test asks.
const seedLibrary = async (extraCopies: Array<{ name?: string }>) => {
  useMemoryStorage();
  const repository = new AsyncStoragePracticeRepository();
  const source = buildSource('Alto', 'alto-file');

  await repository.saveSource(OWNER_ID, source);
  let tree = await repository.listLibraryFileTree(OWNER_ID);

  for (const [index, copy] of extraCopies.entries()) {
    const folder = {
      id: `folder-${index}`,
      name: `Folder ${index}`,
      parentFolderId: ROOT_FOLDER_ID,
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    await repository.saveLibraryFolderNode(OWNER_ID, folder);
    tree = await repository.saveLibraryFileLink(OWNER_ID, {
      id: `copy-${index}`,
      parentFolderId: folder.id,
      entityKind: 'track',
      entityId: source.id,
      ...(copy.name ? { visibleName: copy.name } : {}),
    });
  }

  return { repository, source, tree };
};

describe('renameTrack', () => {
  it('renames the track and its only copy', async () => {
    const { repository, source } = await seedLibrary([]);

    const result = await repository.renameTrack(OWNER_ID, {
      copies: 'all',
      name: '  Alto 1  ',
      sourceId: source.id,
    });

    assert.equal(result.sources[0]?.name, 'Alto 1');
    assert.deepEqual(
      listTrackCopies(result.tree, source.id).map((c) => c.visibleName),
      ['Alto 1'],
    );
  });

  it('renames every copy when asked to', async () => {
    const { repository, source } = await seedLibrary([
      { name: 'Alto (rehearsal)' },
    ]);

    const result = await repository.renameTrack(OWNER_ID, {
      copies: 'all',
      name: 'Alto 1',
      sourceId: source.id,
    });

    assert.deepEqual(
      listTrackCopies(result.tree, source.id).map((c) => c.visibleName),
      ['Alto 1', 'Alto 1'],
    );
  });

  it('leaves a copy with its own name when only matching copies follow', async () => {
    const { repository, source } = await seedLibrary([
      { name: 'Alto (rehearsal)' },
    ]);

    const result = await repository.renameTrack(OWNER_ID, {
      copies: 'matching',
      name: 'Alto 1',
      sourceId: source.id,
    });
    const names = listTrackCopies(result.tree, source.id).map(
      (c) => c.visibleName,
    );

    assert.equal(result.sources[0]?.name, 'Alto 1');
    assert.deepEqual(names.sort(), ['Alto (rehearsal)', 'Alto 1']);
  });

  it('puts the track back when a copy would clash with a neighbour', async () => {
    const { repository, source } = await seedLibrary([{}]);

    await repository.saveSource(OWNER_ID, buildSource('Tenor', 'tenor-file'));
    await assert.rejects(
      repository.renameTrack(OWNER_ID, {
        copies: 'all',
        name: 'Tenor',
        sourceId: source.id,
      }),
    );

    const sources = await repository.listSources(OWNER_ID);

    assert.ok(sources.some(({ name }) => name === 'Alto'));
  });

  it('rejects an empty name and an unknown track', async () => {
    const { repository, source } = await seedLibrary([]);

    await assert.rejects(
      repository.renameTrack(OWNER_ID, {
        copies: 'all',
        name: '   ',
        sourceId: source.id,
      }),
    );
    await assert.rejects(
      repository.renameTrack(OWNER_ID, {
        copies: 'all',
        name: 'X',
        sourceId: 'missing',
      }),
    );
  });
});
