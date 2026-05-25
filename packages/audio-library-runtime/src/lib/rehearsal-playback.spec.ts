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

import {
  AsyncStoragePracticeRepository,
  createPlaybackQueue,
  resolveNextQueueIndex,
  resolvePlaylistItems,
  resolvePreviousQueueIndex,
} from './rehearsal-playback.js';

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
  ownershipScope: 'user',
  ownerId: 'user-1',
  createdAt: '2026-05-10T00:00:00.000Z',
  updatedAt: '2026-05-10T00:00:00.000Z',
};

const PLAYLIST: Playlist = {
  id: 'playlist-1',
  name: 'Morning rehearsal',
  items: [
    createPlaylistEntryFromTrack(AVAILABLE_SOURCE, '2026-05-10T01:00:00.000Z'),
    createPlaylistEntryFromLoop(SAVED_LOOP, '2026-05-10T01:05:00.000Z'),
    createPlaylistEntryFromTrack(
      UNAVAILABLE_SOURCE,
      '2026-05-10T01:10:00.000Z',
    ),
  ],
  ownershipScope: 'user',
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
