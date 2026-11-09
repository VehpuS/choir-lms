import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createTrackPlayableItem,
  type PlayableItem,
} from '@org/audio-library-models';

import type { PlaylistPlaybackSession } from '../../library/playlists/utils/saved-playlist-playback-view-model';
import { PLAYABLE_SOURCE } from '../../test-utils/library-test-fixtures.js';
import { getRecentRehearsalToRecord } from './recent-recording.js';

const PLAYED_AT = '2026-06-01T09:00:00.000Z';
// The id the queue state module gives the transient `Current queue` session.
const TRANSIENT_QUEUE_ID = 'transient-queue';

const entryItem = (id: string, entryId: string): PlayableItem => ({
  ...createTrackPlayableItem({ ...PLAYABLE_SOURCE, id, name: `${id}.mp3` }),
  playlistEntryId: entryId,
});

const sessionOf = (
  playlistId: string,
  items: PlayableItem[],
): PlaylistPlaybackSession => ({
  currentIndex: 0,
  hasCompleted: false,
  playlistId,
  playlistName: 'Warmups',
  queue: { items, mode: 'ordered', playlistId, repeatMode: 'off' },
  requestedItemCount: items.length,
});

describe('getRecentRehearsalToRecord', () => {
  it('records a saved playlist session as the playlist with the active entry', () => {
    const first = entryItem('a', 'entry-1');
    const second = entryItem('b', 'entry-2');

    const recorded = getRecentRehearsalToRecord({
      activePlayableItem: second,
      activePlaylistSession: sessionOf('playlist-1', [first, second]),
      playedAt: PLAYED_AT,
    });

    assert.equal(recorded?.kind, 'playlist');
    assert.equal(recorded?.id, 'playlist-1');
    assert.equal(
      recorded?.kind === 'playlist' ? recorded.lastEntryId : null,
      'entry-2',
    );
  });

  it('records a track started from the middle of a playlist as its last entry', () => {
    const first = entryItem('a', 'entry-1');
    const second = entryItem('b', 'entry-2');

    const recorded = getRecentRehearsalToRecord({
      activePlayableItem: second,
      activePlaylistSession: {
        ...sessionOf('playlist-1', [second, first]),
        currentIndex: 0,
      },
      playedAt: PLAYED_AT,
    });

    assert.equal(
      recorded?.kind === 'playlist' ? recorded.lastEntryId : null,
      'entry-2',
    );
  });

  it('records the item itself for the transient queue', () => {
    const queued = entryItem('a', 'queue-entry-1');

    const recorded = getRecentRehearsalToRecord({
      activePlayableItem: queued,
      activePlaylistSession: sessionOf(TRANSIENT_QUEUE_ID, [queued]),
      playedAt: PLAYED_AT,
    });

    assert.equal(recorded?.kind, 'track');
    assert.equal(recorded?.id, queued.id);
  });

  it('records the item itself when there is no session', () => {
    const track = createTrackPlayableItem(PLAYABLE_SOURCE);

    const recorded = getRecentRehearsalToRecord({
      activePlayableItem: track,
      activePlaylistSession: null,
      playedAt: PLAYED_AT,
    });

    assert.equal(recorded?.kind, 'track');
    assert.equal(recorded?.id, track.id);
  });

  it('records nothing while the previous item is still active after a playlist starts', () => {
    const previous = entryItem('old', 'old-entry');

    const recorded = getRecentRehearsalToRecord({
      activePlayableItem: previous,
      activePlaylistSession: sessionOf('playlist-1', [
        entryItem('a', 'entry-1'),
      ]),
      playedAt: PLAYED_AT,
    });

    assert.equal(recorded, null);
  });

  it('records nothing for a standalone item active under a playlist session', () => {
    const standalone = createTrackPlayableItem(PLAYABLE_SOURCE);

    const recorded = getRecentRehearsalToRecord({
      activePlayableItem: standalone,
      activePlaylistSession: sessionOf('playlist-1', [
        entryItem('a', 'entry-1'),
      ]),
      playedAt: PLAYED_AT,
    });

    assert.equal(recorded, null);
  });

  it('records a standalone track queued into a saved playlist session as the track', () => {
    const queued = createTrackPlayableItem(PLAYABLE_SOURCE);

    const recorded = getRecentRehearsalToRecord({
      activePlayableItem: queued,
      activePlaylistSession: sessionOf('playlist-1', [
        entryItem('a', 'entry-1'),
        queued,
      ]),
      playedAt: PLAYED_AT,
    });

    assert.equal(recorded?.kind, 'track');
    assert.equal(recorded?.id, queued.id);
  });

  it('records an item queued from another saved playlist as that playlist', () => {
    const fromOther = {
      ...entryItem('x', 'other-entry'),
      playlistId: 'playlist-2',
    };

    const recorded = getRecentRehearsalToRecord({
      activePlayableItem: fromOther,
      activePlaylistSession: sessionOf('playlist-1', [
        entryItem('a', 'entry-1'),
        fromOther,
      ]),
      playedAt: PLAYED_AT,
      resolvePlaylistName: (id) => (id === 'playlist-2' ? 'Sunday set' : null),
    });

    assert.equal(recorded?.id, 'playlist-2');
    assert.equal(
      recorded?.kind === 'playlist' ? recorded.lastEntryId : null,
      'other-entry',
    );
    assert.equal(recorded?.title, 'Sunday set');
  });

  it('records nothing for another playlist whose name cannot be resolved', () => {
    const fromOther = {
      ...entryItem('x', 'other-entry'),
      playlistId: 'playlist-2',
    };

    assert.equal(
      getRecentRehearsalToRecord({
        activePlayableItem: fromOther,
        activePlaylistSession: sessionOf('playlist-1', [fromOther]),
        playedAt: PLAYED_AT,
      }),
      null,
    );
  });

  it('records nothing for the previous other-playlist item before the new session loads', () => {
    const previous = {
      ...entryItem('x', 'other-entry'),
      playlistId: 'playlist-2',
    };

    assert.equal(
      getRecentRehearsalToRecord({
        activePlayableItem: previous,
        activePlaylistSession: sessionOf('playlist-1', [
          entryItem('a', 'entry-1'),
        ]),
        playedAt: PLAYED_AT,
        resolvePlaylistName: () => 'Sunday set',
      }),
      null,
    );
  });
});
