import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  createDriveAudioSource,
  createPlaylist,
  type NamedLoop,
} from '@org/audio-library-models';
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

describe('AsyncStoragePracticeRepository file-tree deletion', () => {
  it('deletes folder subtrees while preserving entities that still have links elsewhere', async () => {
    const storage = new Map<string, string>();
    const repository = new AsyncStoragePracticeRepository();

    configureTestStorage(storage);
    await repository.saveSource('user-1', AVAILABLE_SOURCE);
    await repository.saveLibraryFolderNode('user-1', {
      id: 'folder-1',
      name: 'Warmups',
      parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      createdAt: '2026-05-10T10:00:00.000Z',
    });
    await repository.saveLibraryFileLink('user-1', {
      id: 'file-link:track:copy-1',
      parentFolderId: 'folder-1',
      entityKind: 'track',
      entityId: AVAILABLE_SOURCE.id,
      visibleName: 'Warmup copy',
    });

    const nextTree = await repository.deleteLibraryFolderNode(
      'user-1',
      'folder-1',
    );

    assert.equal(
      nextTree.folders.some((folder) => folder.id === 'folder-1'),
      false,
    );
    assert.deepEqual(
      nextTree.fileLinks.map((fileLink) => fileLink.id),
      [`file-link:track:${AVAILABLE_SOURCE.id}`],
    );
    assert.deepEqual(await repository.listSources('user-1'), [
      AVAILABLE_SOURCE,
    ]);
  });

  it('deletes the underlying entity when folder deletion removes its last link', async () => {
    const storage = new Map<string, string>();
    const repository = new AsyncStoragePracticeRepository();

    configureTestStorage(storage);
    await repository.saveSource('user-1', AVAILABLE_SOURCE);
    await repository.saveLibraryFolderNode('user-1', {
      id: 'folder-1',
      name: 'Warmups',
      parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      createdAt: '2026-05-10T10:00:00.000Z',
    });
    await repository.saveLibraryFileLink('user-1', {
      id: `file-link:track:${AVAILABLE_SOURCE.id}`,
      parentFolderId: 'folder-1',
      entityKind: 'track',
      entityId: AVAILABLE_SOURCE.id,
    });

    const nextTree = await repository.deleteLibraryFolderNode(
      'user-1',
      'folder-1',
    );

    assert.deepEqual(await repository.listSources('user-1'), []);
    assert.deepEqual(nextTree.fileLinks, []);
  });

  it('cascades source deletion through loops, file links, and playlist entries', async () => {
    const storage = new Map<string, string>();
    const repository = new AsyncStoragePracticeRepository();
    const loop: NamedLoop = {
      createdAt: '2026-07-01T00:00:00.000Z',
      endMs: 24000,
      id: 'loop-1',
      name: 'Verse entrance',
      ownerId: 'user-1',
      sourceId: AVAILABLE_SOURCE.id,
      sourceName: AVAILABLE_SOURCE.name,
      startMs: 12000,
      updatedAt: '2026-07-01T00:00:00.000Z',
    };

    configureTestStorage(storage);
    await repository.saveSource('user-1', AVAILABLE_SOURCE);
    await repository.saveLoop(loop);
    await repository.saveLibraryFileLink('user-1', {
      id: 'file-link:track:copy-1',
      parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      entityKind: 'track',
      entityId: AVAILABLE_SOURCE.id,
      visibleName: 'Practice copy',
    });
    await repository.savePlaylist(
      addLoopToPlaylist(
        addTrackToPlaylist(
          createPlaylist({
            createdAt: '2026-07-01T00:00:00.000Z',
            name: 'Warmups',
            ownerId: 'user-1',
          }),
          AVAILABLE_SOURCE,
          '2026-07-01T00:01:00.000Z',
        ),
        loop,
        '2026-07-01T00:02:00.000Z',
      ),
    );

    await repository.deleteSource('user-1', AVAILABLE_SOURCE.id);

    const [playlist] = await repository.listPlaylists('user-1');
    const tree = await repository.listLibraryFileTree('user-1');

    assert.deepEqual(await repository.listSources('user-1'), []);
    assert.deepEqual(await repository.listLoops('user-1'), []);
    assert.ok(playlist);
    assert.deepEqual(playlist.items, []);
    assert.deepEqual(tree.fileLinks, [
      {
        entityId: playlist.id,
        entityKind: 'playlist',
        id: `file-link:playlist:${playlist.id}`,
        parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      },
    ]);
  });
});
