import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../test-utils/library-test-fixtures.js';
import {
  appendRecentRehearsalItem,
  buildRecentRehearsalItem,
  getRecentRehearsalLastPlayedLabel,
  persistRecentRehearsalHistory,
  restoreRecentRehearsalHistory,
} from './history.js';

describe('buildRecentRehearsalItem', () => {
  it('tags history entries as playlist items while playlist playback is active', () => {
    const playableItem = createTrackPlayableItem(PLAYABLE_SOURCE);

    const item = buildRecentRehearsalItem({
      activePlayableItem: {
        ...playableItem,
        playlistEntryId: 'entry-1',
      },
      activePlaylistSession: {
        currentIndex: 0,
        hasCompleted: false,
        playlistId: 'playlist-1',
        playlistName: 'Warmups',
        queue: {
          items: [playableItem],
          mode: 'ordered',
          playlistId: 'playlist-1',
          repeatMode: 'off',
        },
        requestedItemCount: 1,
      },
      playedAt: '2026-06-01T09:00:00.000Z',
    });

    assert.equal(item.kind, 'playlist');
    assert.equal(item.playlistName, 'Warmups');
    assert.equal(item.id, 'playlist-1:entry-1');
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
        activePlaylistSession: null,
        playedAt: '2026-06-01T08:30:00.000Z',
      }),
      buildRecentRehearsalItem({
        activePlayableItem: secondTrack,
        activePlaylistSession: null,
        playedAt: '2026-06-01T08:00:00.000Z',
      }),
    ];

    const refreshedHistory = appendRecentRehearsalItem(
      initialHistory,
      buildRecentRehearsalItem({
        activePlayableItem: firstTrack,
        activePlaylistSession: null,
        playedAt: '2026-06-01T09:00:00.000Z',
      }),
    );

    assert.equal(refreshedHistory.length, 2);
    assert.equal(refreshedHistory[0]?.title, firstTrack.title);
    assert.equal(refreshedHistory[1]?.title, secondTrack.title);
    assert.equal(refreshedHistory[0]?.playedAt, '2026-06-01T09:00:00.000Z');
  });
});

describe('recent rehearsal persistence', () => {
  it('writes and restores compact history data', async () => {
    const store = new Map<string, string>();
    const playableItem = createTrackPlayableItem(PLAYABLE_SOURCE);

    const history = [
      buildRecentRehearsalItem({
        activePlayableItem: playableItem,
        activePlaylistSession: null,
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
});