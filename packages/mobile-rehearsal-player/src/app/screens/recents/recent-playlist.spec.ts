import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createTrackPlayableItem,
  type Playlist,
  type PlaylistEntry,
} from '@org/audio-library-models';

import { queuePlayableItemsDuringPlayback } from '../../library/playlists/utils/playlist-playback-queue-state';
import { PLAYABLE_SOURCE } from '../../test-utils/library-test-fixtures.js';
import {
  buildRecentPlaylistItem,
  buildRecentRehearsalItem,
} from './history.js';
import {
  filterRecentsToExistingPlaylists,
  resolvePlaylistResumeEntryId,
  resolveRecentPlaylistItems,
} from './recent-playlist.js';

const playlistEntry = (
  id: string,
  sortIndex: number,
  sourceId: string,
): PlaylistEntry => ({
  createdAt: '2026-06-01T00:00:00.000Z',
  id,
  kind: 'track',
  playlistId: 'playlist-1',
  sortIndex,
  sourceId,
  title: id,
});

const PLAYLIST: Playlist = {
  createdAt: '2026-06-01T00:00:00.000Z',
  id: 'playlist-1',
  items: [
    playlistEntry('entry-1', 0, PLAYABLE_SOURCE.id),
    playlistEntry('entry-2', 1, 'drive:missing'),
  ],
  name: 'Warmups',
  ownerId: 'owner-1',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const resolve = (lastEntryId: string) =>
  resolvePlaylistResumeEntryId(
    { lastEntryId },
    {
      composites: [],
      loops: [],
      playlist: PLAYLIST,
      recordings: [],
      sources: [PLAYABLE_SOURCE],
    },
  );

describe('resolvePlaylistResumeEntryId', () => {
  it('resumes at the last entry while it is still playable', () => {
    assert.equal(resolve('entry-1'), 'entry-1');
  });

  it('starts from the top when the last entry was removed from the playlist', () => {
    assert.equal(resolve('entry-gone'), undefined);
  });

  it('starts from the top when the last entry can no longer be resolved', () => {
    assert.equal(resolve('entry-2'), undefined);
  });
});

describe('filterRecentsToExistingPlaylists', () => {
  const playlist = buildRecentPlaylistItem({
    lastEntryId: 'entry-1',
    playedAt: '2026-06-01T09:00:00.000Z',
    playlistId: 'playlist-1',
    playlistName: 'Warmups',
  });
  const track = buildRecentRehearsalItem({
    activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
    playedAt: '2026-06-01T08:00:00.000Z',
  });

  it('hides a playlist row whose playlist no longer exists', () => {
    assert.deepEqual(filterRecentsToExistingPlaylists([playlist, track], []), [
      track,
    ]);
  });

  it('keeps a playlist row whose playlist still exists', () => {
    assert.deepEqual(
      filterRecentsToExistingPlaylists([playlist, track], [PLAYLIST]),
      [playlist, track],
    );
  });
});

describe('queueing a recent playlist', () => {
  const library = {
    composites: [],
    loops: [],
    playlist: PLAYLIST,
    recordings: [],
    sources: [PLAYABLE_SOURCE],
  };

  it('resolves the playable items in playlist order and skips unresolvable ones', () => {
    const second = { ...PLAYABLE_SOURCE, id: 'drive:tenor-line' };
    const items = resolveRecentPlaylistItems({
      ...library,
      playlist: {
        ...PLAYLIST,
        items: [
          playlistEntry('entry-1', 0, 'drive:tenor-line'),
          playlistEntry('entry-gone', 1, 'drive:missing'),
          playlistEntry('entry-2', 2, PLAYABLE_SOURCE.id),
        ],
      },
      sources: [PLAYABLE_SOURCE, second],
    });

    assert.deepEqual(
      items.map((item) => item.playlistEntryId),
      ['entry-1', 'entry-2'],
    );
  });

  it('seeds a transient queue from standalone playback and appends in order', () => {
    const playing = createTrackPlayableItem(PLAYABLE_SOURCE);
    const items = resolveRecentPlaylistItems(library);

    const session = queuePlayableItemsDuringPlayback({
      activePlayableItem: playing,
      playableItems: items,
      position: 'up-next',
      repeatMode: 'off',
      session: null,
    });

    assert.equal(session?.queue.items.length, 1 + items.length);
    assert.equal(session?.queue.items[0]?.id, playing.id);
    assert.equal(session?.queue.items[1]?.playlistEntryId, 'entry-1');
  });
});
