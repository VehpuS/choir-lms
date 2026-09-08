import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import { AsyncStoragePracticeRepository } from './rehearsal-playback.js';

const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;
const originalAsyncStorage = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};

const availableSource = createDriveAudioSource({
  driveFileId: 'drive-file-1',
  name: 'Full Choir.mp3',
  mimeType: 'audio/mpeg',
  availability: { status: 'available' },
});

const unavailableSource = createDriveAudioSource({
  driveFileId: 'drive-file-2',
  name: 'Reference Mix.aiff',
  mimeType: 'audio/aiff',
  availability: {
    status: 'unsupported',
    reason: 'unsupported-format',
  },
});

const configureTestStorage = (storage: Map<string, string>) => {
  mutableAsyncStorage.getItem = async (key) => storage.get(key) ?? null;
  mutableAsyncStorage.removeItem = async (key) => {
    storage.delete(key);
  };
  mutableAsyncStorage.setItem = async (key, value) => {
    storage.set(key, value);
  };
};

afterEach(() => {
  mutableAsyncStorage.getItem = originalAsyncStorage.getItem;
  mutableAsyncStorage.removeItem = originalAsyncStorage.removeItem;
  mutableAsyncStorage.setItem = originalAsyncStorage.setItem;
});

describe('Drive source location storage', () => {
  it('loads legacy sources without requiring source-location provenance', async () => {
    const storage = new Map<string, string>([
      ['choirlms:practice:sources:user-1', JSON.stringify([availableSource])],
    ]);
    const repository = new AsyncStoragePracticeRepository();
    configureTestStorage(storage);

    const sources = await repository.listSources('user-1');

    assert.deepEqual(sources, [availableSource]);
    assert.equal(sources[0]?.sourceLocation, undefined);
  });

  it('retains valid persisted source-location provenance and omits malformed provenance', async () => {
    const sourceLocation = {
      parentFolderId: 'folder-alto',
      parentFolderName: 'Alto',
      rootKind: 'shared',
      path: [
        { id: 'folder-concert', name: 'Spring concert' },
        { id: 'folder-alto', name: 'Alto' },
      ],
    };
    const storage = new Map<string, string>([
      [
        'choirlms:practice:sources:user-1',
        JSON.stringify([
          { ...availableSource, sourceLocation },
          {
            ...unavailableSource,
            sourceLocation: { ...sourceLocation, rootKind: 'other-drive' },
          },
        ]),
      ],
    ]);
    const repository = new AsyncStoragePracticeRepository();
    configureTestStorage(storage);

    const sources = await repository.listSources('user-1');

    assert.deepEqual(sources[0]?.sourceLocation, sourceLocation);
    assert.equal(sources[1]?.sourceLocation, undefined);
  });

  it('refreshes Drive metadata and provenance without replacing app-owned fields or Library links', async () => {
    const storage = new Map<string, string>();
    const repository = new AsyncStoragePracticeRepository();
    configureTestStorage(storage);

    const [initialSource] = await repository.saveSource('user-1', {
      ...availableSource,
      tags: ['Alto'],
      sourceLocation: {
        parentFolderId: 'folder-old',
        parentFolderName: 'Old folder',
        rootKind: 'my-drive',
        path: [{ id: 'folder-old', name: 'Old folder' }],
      },
    });

    assert.ok(initialSource);

    const initialTree = await repository.listLibraryFileTree('user-1');
    const [rediscoveredSource] = await repository.saveSource('user-1', {
      ...availableSource,
      name: 'Full Choir renamed.mp3',
      durationMs: 245000,
      modifiedTime: '2026-09-08T10:00:00.000Z',
      createdAt: '2099-01-01T00:00:00.000Z',
      sourceLocation: {
        parentFolderId: 'folder-new',
        parentFolderName: 'New folder',
        rootKind: 'shared',
        path: [
          { id: 'folder-concert', name: 'Concert' },
          { id: 'folder-new', name: 'New folder' },
        ],
      },
    });
    const refreshedTree = await repository.listLibraryFileTree('user-1');

    assert.ok(rediscoveredSource);
    assert.equal(rediscoveredSource.name, 'Full Choir renamed.mp3');
    assert.equal(rediscoveredSource.durationMs, 245000);
    assert.equal(rediscoveredSource.modifiedTime, '2026-09-08T10:00:00.000Z');
    assert.deepEqual(rediscoveredSource.tags, initialSource.tags);
    assert.deepEqual(rediscoveredSource.tagAddedAt, initialSource.tagAddedAt);
    assert.equal(rediscoveredSource.createdAt, initialSource.createdAt);
    assert.equal(
      rediscoveredSource.sourceLocation?.parentFolderId,
      'folder-new',
    );
    assert.deepEqual(refreshedTree.fileLinks, initialTree.fileLinks);

    const [sourceWithoutResolvedPath] = await repository.saveSource('user-1', {
      ...availableSource,
      name: 'Full Choir rediscovered without path.mp3',
    });

    assert.deepEqual(
      sourceWithoutResolvedPath?.sourceLocation,
      rediscoveredSource.sourceLocation,
    );
  });
});
