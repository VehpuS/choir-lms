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
        createdAt: '2026-05-10T10:00:00.000Z',
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
      createdAt: '2026-05-10T10:00:00.000Z',
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
      createdAt: '2026-05-10T10:00:00.000Z',
    });
    await repository.saveLibraryFolderNode('user-1', {
      id: 'folder-2',
      name: 'Soprano',
      parentFolderId: 'folder-1',
      createdAt: '2026-05-10T10:00:00.000Z',
    });

    await assert.rejects(
      repository.saveLibraryFolderNode('user-1', {
        id: 'folder-1',
        name: 'Warmups',
        parentFolderId: 'folder-2',
        createdAt: '2026-05-10T10:00:00.000Z',
      }),
      /cannot be moved into itself or one of its descendants/,
    );
  });

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
