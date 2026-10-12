import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  createDriveAudioSource,
  createPlaylistEntryFromLoop,
  createPlaylistEntryFromTrack,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import { REHEARSAL_LIBRARY_ROOT_FOLDER_ID } from './rehearsal-library-files';
import { AsyncStoragePracticeRepository } from './rehearsal-playback.js';

const PLAYLIST_ID = 'playlist-1';

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

const UNAVAILABLE_SOURCE = createDriveAudioSource({
  driveFileId: 'drive-file-2',
  name: 'Reference Mix.aiff',
  mimeType: 'audio/aiff',
  availability: {
    status: 'unsupported',
    reason: 'unsupported-format',
  },
});

const SAVED_LOOP: NamedLoop = {
  id: 'loop-1',
  name: 'Verse entrance',
  sourceId: AVAILABLE_SOURCE.id,
  sourceName: AVAILABLE_SOURCE.name,
  startMs: 12000,
  endMs: 24000,
  ownerId: 'user-1',
  createdAt: '2026-05-10T00:00:00.000Z',
  updatedAt: '2026-05-10T00:00:00.000Z',
};

const PLAYLIST: Playlist = {
  id: PLAYLIST_ID,
  name: 'Morning rehearsal',
  items: [
    createPlaylistEntryFromTrack(AVAILABLE_SOURCE, '2026-05-10T01:00:00.000Z', {
      playlistId: PLAYLIST_ID,
      sortIndex: 0,
    }),
    createPlaylistEntryFromLoop(SAVED_LOOP, '2026-05-10T01:05:00.000Z', {
      playlistId: PLAYLIST_ID,
      sortIndex: 1,
    }),
    createPlaylistEntryFromTrack(
      UNAVAILABLE_SOURCE,
      '2026-05-10T01:10:00.000Z',
      {
        playlistId: PLAYLIST_ID,
        sortIndex: 2,
      },
    ),
  ],
  ownerId: 'user-1',
  createdAt: '2026-05-10T00:00:00.000Z',
  updatedAt: '2026-05-10T00:00:00.000Z',
};

afterEach(() => {
  mutableAsyncStorage.getItem = ORIGINAL_ASYNC_STORAGE.getItem;
  mutableAsyncStorage.removeItem = ORIGINAL_ASYNC_STORAGE.removeItem;
  mutableAsyncStorage.setItem = ORIGINAL_ASYNC_STORAGE.setItem;
});

describe('AsyncStoragePracticeRepository migrations', () => {
  it('migrates legacy stored playlists to explicit entry relationships on read', async () => {
    const storage = new Map<string, string>([
      [
        'choirlms:practice:playlists:user-1',
        JSON.stringify([
          {
            ...PLAYLIST,
            items: [
              {
                id: 'entry-2',
                kind: 'loop',
                sourceId: AVAILABLE_SOURCE.id,
                loopId: SAVED_LOOP.id,
                title: SAVED_LOOP.name,
                description: `${SAVED_LOOP.sourceName} loop`,
                createdAt: '2026-05-10T01:05:00.000Z',
                sortIndex: 9,
              },
              {
                id: 'entry-1',
                kind: 'track',
                sourceId: AVAILABLE_SOURCE.id,
                title: AVAILABLE_SOURCE.name,
                description: 'Full track',
                createdAt: '2026-05-10T01:00:00.000Z',
                sortIndex: 3,
              },
            ],
          },
        ]),
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

    const playlists = await repository.listPlaylists('user-1');

    assert.deepEqual(
      playlists[0]?.items.map((entry: Playlist['items'][number]) => ({
        id: entry.id,
        playlistId: entry.playlistId,
        sortIndex: entry.sortIndex,
      })),
      [
        {
          id: 'entry-1',
          playlistId: PLAYLIST_ID,
          sortIndex: 0,
        },
        {
          id: 'entry-2',
          playlistId: PLAYLIST_ID,
          sortIndex: 1,
        },
      ],
    );
    assert.match(
      storage.get('choirlms:practice:playlists:user-1') ?? '',
      /"playlistId":"playlist-1"/,
    );
  });

  it('migrates canonical library entities into a root folder file tree', async () => {
    const storage = new Map<string, string>([
      ['choirlms:practice:sources:user-1', JSON.stringify([AVAILABLE_SOURCE])],
      ['choirlms:practice:loops:user-1', JSON.stringify([SAVED_LOOP])],
      ['choirlms:practice:playlists:user-1', JSON.stringify([PLAYLIST])],
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

    const migratedTree = await repository.listLibraryFileTree('user-1');
    const [rootFolder] = migratedTree.folders;

    assert.ok(rootFolder);
    assert.equal(Number.isNaN(Date.parse(rootFolder.createdAt)), false);
    assert.deepEqual(migratedTree, {
      version: 1,
      rootFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      folders: [
        {
          id: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
          name: 'Library',
          parentFolderId: null,
          createdAt: rootFolder.createdAt,
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
          id: `file-link:loop:${SAVED_LOOP.id}`,
          parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
          entityKind: 'loop',
          entityId: SAVED_LOOP.id,
        },
        {
          id: `file-link:playlist:${PLAYLIST.id}`,
          parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
          entityKind: 'playlist',
          entityId: PLAYLIST.id,
        },
      ],
    });
    assert.equal(storage.has('choirlms:practice:library-tree:user-1'), true);
  });

  it('keeps canonical entities until the last file link is removed', async () => {
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
    await repository.saveSource('user-1', {
      ...AVAILABLE_SOURCE,
      name: 'Full Choir updated.mp3',
    });

    const treeWithHardLink = await repository.listLibraryFileTree('user-1');

    assert.equal(
      treeWithHardLink.fileLinks.filter((fileLink) => {
        return (
          fileLink.entityKind === 'track' &&
          fileLink.entityId === AVAILABLE_SOURCE.id
        );
      }).length,
      2,
    );
    assert.equal(
      treeWithHardLink.fileLinks.find(
        (fileLink) => fileLink.id === 'file-link:track:copy-1',
      )?.visibleName,
      'Warmup copy',
    );
    assert.deepEqual(
      (await repository.listSources('user-1')).map((source) => source.name),
      ['Full Choir updated.mp3'],
    );

    await repository.deleteLibraryFileLink('user-1', 'file-link:track:copy-1');

    assert.deepEqual(
      (await repository.listSources('user-1')).map((source) => source.name),
      ['Full Choir updated.mp3'],
    );
    assert.equal(
      (await repository.listLibraryFileTree('user-1')).fileLinks.filter(
        (fileLink) => {
          return (
            fileLink.entityKind === 'track' &&
            fileLink.entityId === AVAILABLE_SOURCE.id
          );
        },
      ).length,
      1,
    );

    await repository.deleteLibraryFileLink(
      'user-1',
      `file-link:track:${AVAILABLE_SOURCE.id}`,
    );

    assert.deepEqual(await repository.listSources('user-1'), []);
    assert.deepEqual(
      (await repository.listLibraryFileTree('user-1')).fileLinks,
      [],
    );
  });
});
