import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../test-utils/library-test-fixtures.js';
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
});
