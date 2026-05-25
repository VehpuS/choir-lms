import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addTrackToPlaylist,
  createPlaylist,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../test-utils/library-test-fixtures.js';
import { buildPlaylistPlaybackSession } from '../../library/utils/saved-playlist-playback-view-model.js';
import { SHELL_DESTINATIONS, getMiniPlayerSummary } from '../shell-model.js';

describe('SHELL_DESTINATIONS', () => {
  it('defines the Home, Search, and Library shell order', () => {
    assert.deepEqual(
      SHELL_DESTINATIONS.map((destination) => destination.label),
      ['Home', 'Search', 'Library'],
    );
  });
});

describe('getMiniPlayerSummary', () => {
  it('returns null when no rehearsal item is active', () => {
    assert.equal(
      getMiniPlayerSummary({
        activePlayableItem: null,
        isPlaybackPreparing: false,
        playbackPositionSeconds: 0,
        playbackState: 'none',
      }),
      null,
    );
  });

  it('summarizes active playback progress for the mini-player', () => {
    const summary = getMiniPlayerSummary({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      isPlaybackPreparing: false,
      playbackPositionSeconds: 18,
      playbackState: 'playing',
    });

    assert.deepEqual(summary, {
      detail:
        'Playing stays available while you move between Home, Search, and Library. Focused now-playing and queue controls land in the later playback slice.',
      status: 'Playing • 0:18',
      title: 'Alto Line.mp3',
    });
  });

  it('prefers a loading state while playback is preparing', () => {
    const summary = getMiniPlayerSummary({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      isPlaybackPreparing: true,
      playbackPositionSeconds: 4,
      playbackState: 'paused',
    });

    assert.equal(summary?.status, 'Loading • 0:04');
  });

  it('includes active playlist queue context when playback started from a playlist', () => {
    const playlistSession = buildPlaylistPlaybackSession({
      loops: [],
      mode: 'shuffle',
      playlist: addTrackToPlaylist(
        createPlaylist({
          createdAt: '2026-05-12T00:00:00.000Z',
          name: 'Warmups',
          ownerId: 'user-1',
        }),
        PLAYABLE_SOURCE,
        '2026-05-12T00:01:00.000Z',
      ),
      repeatMode: 'all',
      sources: [PLAYABLE_SOURCE],
    }).session;

    if (!playlistSession) {
      throw new Error('Expected a playlist session.');
    }

    const summary = getMiniPlayerSummary({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      activePlaylistSession: playlistSession,
      isPlaybackPreparing: false,
      playbackPositionSeconds: 18,
      playbackState: 'playing',
    });

    assert.equal(
      summary?.detail,
      'Active session • Warmups • item 1 of 1 • Shuffle • Repeat all. Focused now-playing and queue controls land in the later playback slice.',
    );
  });
});
