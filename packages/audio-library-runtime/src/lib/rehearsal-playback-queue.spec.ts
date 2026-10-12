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
