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

describe('AsyncStoragePracticeRepository tag timestamps', () => {
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
    assert.equal(
      backfilledPlaylist.tagAddedAt?.Soprano,
      legacyPlaylist.createdAt,
    );
  });
});
