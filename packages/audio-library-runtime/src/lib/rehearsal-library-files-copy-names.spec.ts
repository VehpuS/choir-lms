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

describe('resolveRehearsalLibraryCopyVisibleName', () => {
  it('returns the first Copy suffix when no sibling copy exists yet', () => {
    const copyName = resolveRehearsalLibraryCopyVisibleName({
      tree: {
        version: 1,
        rootFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
        folders: [
          {
            id: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
            name: 'Library',
            parentFolderId: null,
            createdAt: '2026-05-10T10:00:00.000Z',
          },
        ],
        fileLinks: [
          {
            id: `file-link:track:${AVAILABLE_SOURCE.id}`,
            parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
            entityKind: 'track',
            entityId: AVAILABLE_SOURCE.id,
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

    assert.equal(copyName, `${AVAILABLE_SOURCE.name} Copy`);
  });

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
            createdAt: '2026-05-10T10:00:00.000Z',
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
