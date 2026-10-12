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
});
