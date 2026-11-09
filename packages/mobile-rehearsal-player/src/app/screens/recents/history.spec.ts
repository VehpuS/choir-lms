import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../test-utils/library-test-fixtures.js';
import {
  appendRecentRehearsalItem,
  buildRecentPlaylistItem,
  buildRecentRehearsalItem,
  getRecentRehearsalLastPlayedLabel,
  persistRecentRehearsalHistory,
  restoreRecentRehearsalHistory,
  upsertRecentPlaylist,
} from './history.js';

describe('buildRecentPlaylistItem', () => {
  it('identifies the playlist by its id and titles it with its name', () => {
    const item = buildRecentPlaylistItem({
      lastEntryId: 'entry-1',
      playedAt: '2026-06-01T09:00:00.000Z',
      playlistId: 'playlist-1',
      playlistName: 'Warmups',
    });

    assert.equal(item.kind, 'playlist');
    assert.equal(item.id, 'playlist-1');
    assert.equal(item.title, 'Warmups');
    assert.equal(item.lastEntryId, 'entry-1');
  });
});

describe('appendRecentRehearsalItem', () => {
  it('keeps one entry per item and keeps the newest item first', () => {
    const firstTrack = createTrackPlayableItem(PLAYABLE_SOURCE);
    const secondTrack = createTrackPlayableItem({
      ...PLAYABLE_SOURCE,
      id: 'drive:tenor-line',
      name: 'Tenor Line.mp3',
    });

    const initialHistory = [
      buildRecentRehearsalItem({
        activePlayableItem: firstTrack,
        playedAt: '2026-06-01T08:30:00.000Z',
      }),
      buildRecentRehearsalItem({
        activePlayableItem: secondTrack,
        playedAt: '2026-06-01T08:00:00.000Z',
      }),
    ];

    const refreshedHistory = appendRecentRehearsalItem(
      initialHistory,
      buildRecentRehearsalItem({
        activePlayableItem: firstTrack,
        playedAt: '2026-06-01T09:00:00.000Z',
      }),
    );

    assert.equal(refreshedHistory.length, 2);
    assert.equal(refreshedHistory[0]?.title, firstTrack.title);
    assert.equal(refreshedHistory[1]?.title, secondTrack.title);
    assert.equal(refreshedHistory[0]?.playedAt, '2026-06-01T09:00:00.000Z');
  });
});

const storageReturning = (storedValue: string) => ({
  async getItem() {
    return storedValue;
  },
  async removeItem() {
    throw new Error('not used');
  },
  async setItem() {
    throw new Error('not used');
  },
});

describe('upsertRecentPlaylist', () => {
  const playlistAt = (playlistId: string, lastEntryId: string, hour: number) =>
    buildRecentPlaylistItem({
      lastEntryId,
      playedAt: `2026-06-01T0${hour}:00:00.000Z`,
      playlistId,
      playlistName: playlistId,
    });
  const trackAt = (id: string) =>
    buildRecentRehearsalItem({
      activePlayableItem: createTrackPlayableItem({
        ...PLAYABLE_SOURCE,
        id,
        name: `${id}.mp3`,
      }),
      playedAt: '2026-06-01T07:00:00.000Z',
    });

  it('updates the playlist entry in place instead of adding a row', () => {
    const history = upsertRecentPlaylist(
      [playlistAt('p1', 'entry-1', 8)],
      playlistAt('p1', 'entry-2', 9),
    );

    assert.equal(history.length, 1);
    assert.equal(
      history[0]?.kind === 'playlist' && history[0].lastEntryId,
      'entry-2',
    );
    assert.equal(history[0]?.playedAt, '2026-06-01T09:00:00.000Z');
  });

  it('moves the playlist to the front without disturbing the others', () => {
    const history = upsertRecentPlaylist(
      [trackAt('a'), playlistAt('p1', 'entry-1', 8), trackAt('b')],
      playlistAt('p1', 'entry-3', 9),
    );

    assert.deepEqual(
      history.map((item) => item.id),
      ['p1', 'track:a', 'track:b'],
    );
  });

  it('evicts the oldest item once the cap of five is exceeded', () => {
    const history = upsertRecentPlaylist(
      ['a', 'b', 'c', 'd', 'e'].map(trackAt),
      playlistAt('p1', 'entry-1', 9),
    );

    assert.deepEqual(
      history.map((item) => item.id),
      ['p1', 'track:a', 'track:b', 'track:c', 'track:d'],
    );
  });
});

describe('recent rehearsal persistence', () => {
  it('writes and restores compact history data', async () => {
    const store = new Map<string, string>();
    const playableItem = createTrackPlayableItem(PLAYABLE_SOURCE);

    const history = [
      buildRecentRehearsalItem({
        activePlayableItem: playableItem,
        playedAt: '2026-06-01T09:00:00.000Z',
      }),
    ];

    await persistRecentRehearsalHistory(history, {
      async getItem(key) {
        return store.get(key) ?? null;
      },
      async removeItem(key) {
        store.delete(key);
      },
      async setItem(key, value) {
        store.set(key, value);
      },
    });

    const restoredHistory = await restoreRecentRehearsalHistory({
      async getItem(key) {
        return store.get(key) ?? null;
      },
      async removeItem() {
        throw new Error('not used');
      },
      async setItem() {
        throw new Error('not used');
      },
    });

    assert.equal(restoredHistory.length, 1);
    assert.equal(restoredHistory[0]?.title, playableItem.title);
  });

  it('drops loop editor previews from stored history', async () => {
    const track = createTrackPlayableItem(PLAYABLE_SOURCE);
    const preview = {
      ...track,
      id: 'loop-preview:drive:a',
      kind: 'loop' as const,
    };
    const stored = JSON.stringify(
      [track, preview].map((playableItem) =>
        buildRecentRehearsalItem({
          activePlayableItem: playableItem,
          playedAt: '2026-06-01T09:00:00.000Z',
        }),
      ),
    );

    const restoredHistory = await restoreRecentRehearsalHistory({
      async getItem() {
        return stored;
      },
      async removeItem() {
        throw new Error('not used');
      },
      async setItem() {
        throw new Error('not used');
      },
    });

    assert.deepEqual(
      restoredHistory.map((item) => item.id),
      [track.id],
    );
  });

  it('round-trips a playlist entry', async () => {
    const playlist = buildRecentPlaylistItem({
      lastEntryId: 'entry-2',
      playedAt: '2026-06-01T09:00:00.000Z',
      playlistId: 'playlist-1',
      playlistName: 'Warmups',
    });

    const restoredHistory = await restoreRecentRehearsalHistory(
      storageReturning(JSON.stringify([playlist])),
    );

    assert.deepEqual(restoredHistory, [playlist]);
  });

  it('drops per-track playlist rows stored before playlists were entries', async () => {
    const track = createTrackPlayableItem(PLAYABLE_SOURCE);
    const oldPlaylistRow = {
      id: 'playlist-1:entry-1',
      kind: 'playlist',
      playedAt: '2026-06-01T09:00:00.000Z',
      playableItem: track,
      playlistName: 'Warmups',
      title: track.title,
    };
    const keptTrack = buildRecentRehearsalItem({
      activePlayableItem: track,
      playedAt: '2026-06-01T08:00:00.000Z',
    });

    const restoredHistory = await restoreRecentRehearsalHistory(
      storageReturning(JSON.stringify([oldPlaylistRow, keptTrack])),
    );

    assert.deepEqual(
      restoredHistory.map((item) => item.id),
      [keptTrack.id],
    );
  });

  it('returns an empty list for malformed persisted values', async () => {
    const restoredHistory = await restoreRecentRehearsalHistory({
      async getItem() {
        return '{"bad-json":';
      },
      async removeItem() {
        throw new Error('not used');
      },
      async setItem() {
        throw new Error('not used');
      },
    });

    assert.deepEqual(restoredHistory, []);
  });
});

describe('getRecentRehearsalLastPlayedLabel', () => {
  it('falls back to a generic label when date parsing fails', () => {
    assert.equal(
      getRecentRehearsalLastPlayedLabel('not-a-date'),
      'Last played recently',
    );
  });

  it('uses compact relative labels for recent playback', () => {
    const now = new Date('2026-08-05T15:00:00.000Z');

    assert.equal(
      getRecentRehearsalLastPlayedLabel('2026-08-05T14:15:00.000Z', now),
      'Last played 45 min ago',
    );
    assert.equal(
      getRecentRehearsalLastPlayedLabel('2026-08-05T12:00:00.000Z', now),
      'Last played 3 hr ago',
    );
  });

  it('uses date-only labels for older playback history', () => {
    const now = new Date('2026-08-05T15:00:00.000Z');

    assert.equal(
      getRecentRehearsalLastPlayedLabel('2026-06-01T12:00:00.000Z', now),
      'Last played Jun 1',
    );
    assert.equal(
      getRecentRehearsalLastPlayedLabel('2025-06-01T12:00:00.000Z', now),
      'Last played Jun 1, 2025',
    );
  });
});
