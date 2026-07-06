import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import {
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
  resolveRehearsalLibraryCopyVisibleName,
} from './rehearsal-library-files';
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

const configureTestStorage = (storage: Map<string, string>) => {
  mutableAsyncStorage.getItem = async (key) => {
    return storage.get(key) ?? null;
  };
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

describe('AsyncStoragePracticeRepository file-tree guardrails', () => {
  it('rejects case-insensitive sibling name conflicts against default file-link names', async () => {
    const storage = new Map<string, string>();
    const repository = new AsyncStoragePracticeRepository();

    configureTestStorage(storage);
    await repository.saveSource('user-1', AVAILABLE_SOURCE);

    await assert.rejects(
      repository.saveLibraryFolderNode('user-1', {
        id: 'folder-1',
        name: AVAILABLE_SOURCE.name.toLocaleLowerCase(),
        parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      }),
      /already exists in the target folder/,
    );
  });

  it('rejects case-insensitive duplicate visible names when saving file links', async () => {
    const storage = new Map<string, string>();
    const repository = new AsyncStoragePracticeRepository();

    configureTestStorage(storage);
    await repository.saveSource('user-1', AVAILABLE_SOURCE);
    await repository.saveLibraryFolderNode('user-1', {
      id: 'folder-1',
      name: 'Warmups',
      parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
    });
    await repository.saveLibraryFileLink('user-1', {
      id: 'file-link:track:copy-1',
      parentFolderId: 'folder-1',
      entityKind: 'track',
      entityId: AVAILABLE_SOURCE.id,
      visibleName: 'Warmup copy',
    });

    await assert.rejects(
      repository.saveLibraryFileLink('user-1', {
        id: 'file-link:track:copy-2',
        parentFolderId: 'folder-1',
        entityKind: 'track',
        entityId: AVAILABLE_SOURCE.id,
        visibleName: 'WARMUP COPY',
      }),
      /already exists in the target folder/,
    );
  });

  it('rejects moving a folder into one of its descendants', async () => {
    const storage = new Map<string, string>();
    const repository = new AsyncStoragePracticeRepository();

    configureTestStorage(storage);
    await repository.saveLibraryFolderNode('user-1', {
      id: 'folder-1',
      name: 'Warmups',
      parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
    });
    await repository.saveLibraryFolderNode('user-1', {
      id: 'folder-2',
      name: 'Soprano',
      parentFolderId: 'folder-1',
    });

    await assert.rejects(
      repository.saveLibraryFolderNode('user-1', {
        id: 'folder-1',
        name: 'Warmups',
        parentFolderId: 'folder-2',
      }),
      /cannot be moved into itself or one of its descendants/,
    );
  });
});

describe('resolveRehearsalLibraryCopyVisibleName', () => {
  it('returns a case-insensitively unique Copy suffix for same-folder copies', () => {
    const copyName = resolveRehearsalLibraryCopyVisibleName({
      tree: {
        version: 1,
        rootFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
        folders: [
          {
            id: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
            name: 'Library',
            parentFolderId: null,
          },
        ],
        fileLinks: [
          {
            id: `file-link:track:${AVAILABLE_SOURCE.id}`,
            parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
            entityKind: 'track',
            entityId: AVAILABLE_SOURCE.id,
          },
          {
            id: 'file-link:track:copy-1',
            parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
            entityKind: 'track',
            entityId: AVAILABLE_SOURCE.id,
            visibleName: `${AVAILABLE_SOURCE.name} Copy`,
          },
          {
            id: 'file-link:track:copy-2',
            parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
            entityKind: 'track',
            entityId: AVAILABLE_SOURCE.id,
            visibleName: `${AVAILABLE_SOURCE.name.toLowerCase()} copy 2`,
          },
        ],
      },
      entityCollections: {
        loops: [],
        playlists: [],
        sources: [AVAILABLE_SOURCE],
      },
      parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      sourceName: AVAILABLE_SOURCE.name,
    });

    assert.equal(copyName, `${AVAILABLE_SOURCE.name} Copy 3`);
  });
});
