import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { omit } from 'es-toolkit/compat';
import { createDriveAudioSource } from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import { REHEARSAL_LIBRARY_ROOT_FOLDER_ID } from './rehearsal-library-files';
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

describe('AsyncStoragePracticeRepository timestamps', () => {
  it('backfills createdAt for sources saved before the field existed', async () => {
    const legacySource = omit(AVAILABLE_SOURCE, ['createdAt']);
    const storage = new Map<string, string>([
      ['choirlms:practice:sources:user-1', JSON.stringify([legacySource])],
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

    const [backfilledSource] = await repository.listSources('user-1');

    assert.ok(backfilledSource);
    assert.equal(Number.isNaN(Date.parse(backfilledSource.createdAt)), false);

    const storedSources = JSON.parse(
      storage.get('choirlms:practice:sources:user-1') ?? '[]',
    ) as { createdAt?: string }[];

    assert.equal(storedSources[0]?.createdAt, backfilledSource.createdAt);
  });

  it('backfills createdAt for folders saved before the field existed', async () => {
    const legacyFolder = {
      id: 'folder-1',
      name: 'Warmups',
      parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
    };
    const storage = new Map<string, string>([
      [
        'choirlms:practice:library-tree:user-1',
        JSON.stringify({
          version: 1,
          rootFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
          folders: [
            {
              id: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
              name: 'Library',
              parentFolderId: null,
            },
            legacyFolder,
          ],
          fileLinks: [],
        }),
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

    const tree = await repository.listLibraryFileTree('user-1');
    const rootFolder = tree.folders.find(
      (folder) => folder.id === REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
    );
    const backfilledFolder = tree.folders.find(
      (folder) => folder.id === 'folder-1',
    );

    assert.ok(rootFolder);
    assert.ok(backfilledFolder);
    assert.equal(Number.isNaN(Date.parse(rootFolder.createdAt)), false);
    assert.equal(Number.isNaN(Date.parse(backfilledFolder.createdAt)), false);

    const storedTree = JSON.parse(
      storage.get('choirlms:practice:library-tree:user-1') ?? '{}',
    ) as { folders: { id: string; createdAt?: string }[] };
    const storedBackfilledFolder = storedTree.folders.find(
      (folder) => folder.id === 'folder-1',
    );

    assert.equal(storedBackfilledFolder?.createdAt, backfilledFolder.createdAt);
  });

  it('stamps createdAt on a new source and preserves it across edits with a different incoming value', async () => {
    const storage = new Map<string, string>();
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

    const [firstSaved] = await repository.saveSource('user-1', {
      ...AVAILABLE_SOURCE,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    assert.ok(firstSaved);
    assert.equal(firstSaved.createdAt, '2026-01-01T00:00:00.000Z');

    const [secondSaved] = await repository.saveSource('user-1', {
      ...firstSaved,
      name: 'Full Choir (renamed).mp3',
      createdAt: '2099-01-01T00:00:00.000Z',
    });

    assert.ok(secondSaved);
    assert.equal(secondSaved.createdAt, '2026-01-01T00:00:00.000Z');
    assert.equal(secondSaved.name, 'Full Choir (renamed).mp3');
  });

  it('stamps createdAt on a new folder and preserves it across edits with a different incoming value', async () => {
    const storage = new Map<string, string>();
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

    const firstTree = await repository.saveLibraryFolderNode('user-1', {
      id: 'folder-1',
      name: 'Warmups',
      parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const firstFolder = firstTree.folders.find(
      (folder) => folder.id === 'folder-1',
    );

    assert.ok(firstFolder);
    assert.equal(firstFolder.createdAt, '2026-01-01T00:00:00.000Z');

    const secondTree = await repository.saveLibraryFolderNode('user-1', {
      ...firstFolder,
      name: 'Warmups (renamed)',
      createdAt: '2099-01-01T00:00:00.000Z',
    });
    const secondFolder = secondTree.folders.find(
      (folder) => folder.id === 'folder-1',
    );

    assert.ok(secondFolder);
    assert.equal(secondFolder.createdAt, '2026-01-01T00:00:00.000Z');
    assert.equal(secondFolder.name, 'Warmups (renamed)');
  });
});
