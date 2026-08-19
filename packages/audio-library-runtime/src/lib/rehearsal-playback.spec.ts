import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { omit } from 'es-toolkit/compat';

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
import {
  AsyncStoragePracticeRepository,
  createPlaybackQueue,
  resolveNextQueueIndex,
  resolvePlaylistItems,
  resolvePreviousQueueIndex,
} from './rehearsal-playback.js';

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

describe('AsyncStoragePracticeRepository', () => {
  it('persists saved sources, loops, and playlists in sorted order and supports deletion', async () => {
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

    const savedSources = await repository.saveSource('user-1', {
      ...AVAILABLE_SOURCE,
      id: 'drive:drive-file-3',
      driveFileId: 'drive-file-3',
      name: 'Amen.mp3',
    });

    await repository.saveSource('user-1', AVAILABLE_SOURCE);

    assert.deepEqual(
      savedSources.map((source) => source.name),
      ['Amen.mp3'],
    );
    assert.deepEqual(
      (await repository.listSources('user-1')).map((source) => source.name),
      ['Amen.mp3', 'Full Choir.mp3'],
    );

    const savedLoops = await repository.saveLoop({
      ...SAVED_LOOP,
      id: 'loop-2',
      name: 'B section',
    });

    await repository.saveLoop(SAVED_LOOP);

    assert.deepEqual(
      savedLoops.map((loop) => loop.name),
      ['B section'],
    );
    assert.deepEqual(
      (await repository.listLoops('user-1')).map((loop) => loop.name),
      ['B section', 'Verse entrance'],
    );

    await repository.savePlaylist({
      ...PLAYLIST,
      id: 'playlist-2',
      name: 'Z Finales',
      items: [],
    });

    await repository.savePlaylist(PLAYLIST);

    assert.deepEqual(
      (await repository.listPlaylists('user-1')).map(
        (playlist) => playlist.name,
      ),
      ['Morning rehearsal', 'Z Finales'],
    );
    assert.deepEqual(
      (await repository.listPlaylists('user-1'))[0]?.items.map(
        (entry: Playlist['items'][number]) => ({
          id: entry.id,
          playlistId: entry.playlistId,
          sortIndex: entry.sortIndex,
        }),
      ),
      [
        {
          id: 'entry:track:drive:drive-file-1:2026-05-10T01:00:00.000Z',
          playlistId: PLAYLIST_ID,
          sortIndex: 0,
        },
        {
          id: 'entry:loop:loop-1:2026-05-10T01:05:00.000Z',
          playlistId: PLAYLIST_ID,
          sortIndex: 1,
        },
        {
          id: 'entry:track:drive:drive-file-2:2026-05-10T01:10:00.000Z',
          playlistId: PLAYLIST_ID,
          sortIndex: 2,
        },
      ],
    );
    assert.deepEqual(
      await repository.deleteSource('user-1', 'drive:drive-file-3'),
      [AVAILABLE_SOURCE],
    );
    assert.deepEqual(await repository.deleteLoop('user-1', 'loop-2'), [
      SAVED_LOOP,
    ]);
    assert.deepEqual(await repository.deletePlaylist('user-1', 'playlist-2'), [
      PLAYLIST,
    ]);
  });

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

  it('removes dependent loops when a saved source is deleted', async () => {
    const storage = new Map<string, string>();
    const repository = new AsyncStoragePracticeRepository();
    const secondarySource = {
      ...AVAILABLE_SOURCE,
      id: 'drive:drive-file-3',
      driveFileId: 'drive-file-3',
      name: 'Amen.mp3',
    };
    const secondaryLoop: NamedLoop = {
      ...SAVED_LOOP,
      id: 'loop-2',
      name: 'Amen entrance',
      sourceId: secondarySource.id,
      sourceName: secondarySource.name,
    };

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
    await repository.saveSource('user-1', secondarySource);
    await repository.saveLoop(SAVED_LOOP);
    await repository.saveLoop(secondaryLoop);

    assert.deepEqual(
      await repository.deleteSource('user-1', secondarySource.id),
      [AVAILABLE_SOURCE],
    );
    assert.deepEqual(await repository.listLoops('user-1'), [SAVED_LOOP]);
  });

  it('drops malformed saved-source storage and treats it as empty', async () => {
    const storage = new Map<string, string>([
      ['choirlms:practice:sources:user-1', '{not-json'],
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

    assert.deepEqual(await repository.listSources('user-1'), []);
    assert.equal(storage.has('choirlms:practice:sources:user-1'), false);

    await repository.saveSource('user-1', AVAILABLE_SOURCE);

    assert.deepEqual(
      (await repository.listSources('user-1')).map((source) => source.name),
      ['Full Choir.mp3'],
    );
  });

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

  it('stamps, preserves, and drops tagAddedAt entries on saveSource', async () => {
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
      tags: ['Alto', 'Warmup'],
    });

    assert.ok(firstSaved);
    assert.ok(firstSaved.tagAddedAt?.Alto);
    assert.ok(firstSaved.tagAddedAt?.Warmup);

    const [secondSaved] = await repository.saveSource('user-1', {
      ...firstSaved,
      tags: ['Alto', 'Soprano'],
    });

    assert.ok(secondSaved);
    assert.equal(secondSaved.tagAddedAt?.Alto, firstSaved.tagAddedAt?.Alto);
    assert.ok(secondSaved.tagAddedAt?.Soprano);
    assert.equal(secondSaved.tagAddedAt?.Warmup, undefined);

    const [thirdSaved] = await repository.saveSource('user-1', {
      ...secondSaved,
      tags: [],
    });

    assert.ok(thirdSaved);
    assert.equal(thirdSaved.tagAddedAt, undefined);
  });

  it('stamps, preserves, and drops tagAddedAt entries on saveLibraryFolderNode', async () => {
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
      createdAt: '2026-05-10T10:00:00.000Z',
      tags: ['Alto', 'Warmup'],
    });
    const firstFolder = firstTree.folders.find(
      (folder) => folder.id === 'folder-1',
    );

    assert.ok(firstFolder);
    assert.ok(firstFolder.tagAddedAt?.Alto);
    assert.ok(firstFolder.tagAddedAt?.Warmup);

    const secondTree = await repository.saveLibraryFolderNode('user-1', {
      ...firstFolder,
      tags: ['Alto', 'Soprano'],
    });
    const secondFolder = secondTree.folders.find(
      (folder) => folder.id === 'folder-1',
    );

    assert.ok(secondFolder);
    assert.equal(secondFolder.tagAddedAt?.Alto, firstFolder.tagAddedAt?.Alto);
    assert.ok(secondFolder.tagAddedAt?.Soprano);
    assert.equal(secondFolder.tagAddedAt?.Warmup, undefined);
  });

  it('backfills tagAddedAt for loops and playlists whose tags predate the field', async () => {
    const legacyLoop = {
      ...omit(SAVED_LOOP, ['tagAddedAt']),
      tags: ['Alto'],
    };
    const legacyPlaylist = {
      ...omit(PLAYLIST, ['tagAddedAt']),
      tags: ['Soprano'],
    };
    const storage = new Map<string, string>([
      ['choirlms:practice:sources:user-1', JSON.stringify([AVAILABLE_SOURCE])],
      ['choirlms:practice:loops:user-1', JSON.stringify([legacyLoop])],
      ['choirlms:practice:playlists:user-1', JSON.stringify([legacyPlaylist])],
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

    const [backfilledLoop] = await repository.listLoops('user-1');
    const [backfilledPlaylist] = await repository.listPlaylists('user-1');

    assert.ok(backfilledLoop);
    assert.equal(backfilledLoop.tagAddedAt?.Alto, legacyLoop.createdAt);

    assert.ok(backfilledPlaylist);
    assert.equal(backfilledPlaylist.tagAddedAt?.Soprano, legacyPlaylist.createdAt);
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

describe('resolvePlaylistItems', () => {
  it('builds playable items only for resolvable, playable sources', () => {
    const items = resolvePlaylistItems(
      PLAYLIST,
      [SAVED_LOOP],
      [AVAILABLE_SOURCE, UNAVAILABLE_SOURCE],
    );

    assert.deepEqual(
      items.map((item) => ({
        id: item.id,
        kind: item.kind,
        playlistId: item.playlistId,
      })),
      [
        {
          id: 'track:drive:drive-file-1',
          kind: 'track',
          playlistId: 'playlist-1',
        },
        {
          id: 'loop:loop-1',
          kind: 'loop',
          playlistId: 'playlist-1',
        },
      ],
    );
  });

  it('keeps repeated playlist entries as distinct queue positions', () => {
    const duplicatePlaylist: Playlist = {
      ...PLAYLIST,
      items: [
        createPlaylistEntryFromTrack(
          AVAILABLE_SOURCE,
          '2026-05-10T01:00:00.000Z',
          {
            playlistId: PLAYLIST_ID,
            sortIndex: 0,
          },
        ),
        createPlaylistEntryFromTrack(
          AVAILABLE_SOURCE,
          '2026-05-10T01:01:00.000Z',
          {
            playlistId: PLAYLIST_ID,
            sortIndex: 1,
          },
        ),
      ],
    };

    const items = resolvePlaylistItems(
      duplicatePlaylist,
      [SAVED_LOOP],
      [AVAILABLE_SOURCE],
    );

    assert.deepEqual(
      items.map((item) => ({
        id: item.id,
        playlistEntryId: item.playlistEntryId,
      })),
      [
        {
          id: 'track:drive:drive-file-1',
          playlistEntryId:
            'entry:track:drive:drive-file-1:2026-05-10T01:00:00.000Z',
        },
        {
          id: 'track:drive:drive-file-1',
          playlistEntryId:
            'entry:track:drive:drive-file-1:2026-05-10T01:01:00.000Z',
        },
      ],
    );
  });
});

describe('createPlaybackQueue', () => {
  it('uses the injected random source when shuffle mode is requested', () => {
    const queue = createPlaybackQueue(
      PLAYLIST,
      [SAVED_LOOP],
      [AVAILABLE_SOURCE, UNAVAILABLE_SOURCE],
      {
        mode: 'shuffle',
        repeatMode: 'all',
        random: () => 0,
      },
    );

    assert.equal(queue.mode, 'shuffle');
    assert.equal(queue.repeatMode, 'all');
    assert.deepEqual(
      queue.items.map((item) => item.id),
      ['loop:loop-1', 'track:drive:drive-file-1'],
    );
  });

  it('normalizes playlist order before building an ordered queue', () => {
    const unorderedPlaylist: Playlist = {
      ...PLAYLIST,
      items: [PLAYLIST.items[1], PLAYLIST.items[0]],
    };

    const queue = createPlaybackQueue(
      unorderedPlaylist,
      [SAVED_LOOP],
      [AVAILABLE_SOURCE],
      {
        mode: 'ordered',
        repeatMode: 'off',
      },
    );

    assert.equal(queue.mode, 'ordered');
    assert.deepEqual(
      queue.items.map((item) => ({
        id: item.id,
        playlistEntryId: item.playlistEntryId,
      })),
      [
        {
          id: 'track:drive:drive-file-1',
          playlistEntryId:
            'entry:track:drive:drive-file-1:2026-05-10T01:00:00.000Z',
        },
        {
          id: 'loop:loop-1',
          playlistEntryId: 'entry:loop:loop-1:2026-05-10T01:05:00.000Z',
        },
      ],
    );
  });
});

describe('queue navigation', () => {
  it('resolves next indexes for repeat and end-of-queue cases', () => {
    assert.equal(resolveNextQueueIndex(0, 0, 'off'), null);
    assert.equal(resolveNextQueueIndex(0, 2, 'one'), 0);
    assert.equal(resolveNextQueueIndex(0, 2, 'off'), 1);
    assert.equal(resolveNextQueueIndex(1, 2, 'all'), 0);
    assert.equal(resolveNextQueueIndex(1, 2, 'off'), null);
  });

  it('resolves previous indexes for repeat and start-of-queue cases', () => {
    assert.equal(resolvePreviousQueueIndex(0, 0, 'off'), null);
    assert.equal(resolvePreviousQueueIndex(1, 2, 'off'), 0);
    assert.equal(resolvePreviousQueueIndex(0, 2, 'all'), 1);
    assert.equal(resolvePreviousQueueIndex(0, 2, 'off'), 0);
  });
});
