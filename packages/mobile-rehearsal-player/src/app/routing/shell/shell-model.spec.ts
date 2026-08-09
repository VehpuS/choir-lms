/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import {
  buildTrackOnlyWarmupsPlaylist,
  buildWarmupsPlaybackSession,
} from '../../library/playlists/utils/saved-playlist-test-fixtures.js';
import { PLAYABLE_SOURCE } from '../../test-utils/library-test-fixtures.js';
import {
  SHELL_DESTINATIONS,
  getMiniPlayerSummary,
  getPlaybackProgressRatio,
} from './shell-model.js';

describe('shell model', () => {
  it('defines the Library, Add, and Recents shell order', () => {
    assert.deepEqual(
      SHELL_DESTINATIONS.map((destination) => destination.label),
      ['Library', 'Add', 'Recents'],
    );
  });

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
      accessibilityLabel:
        'Now playing: Alto Line.mp3. Playing • 0:18 of 3:05 • Saved rehearsal library • Single item playback',
      context: 'Playing • 0:18 of 3:05',
      title: 'Alto Line.mp3',
      waveformProgressRatio: 18 / 185,
    });
  });

  it('prefers a loading state while playback is preparing', () => {
    const summary = getMiniPlayerSummary({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      isPlaybackPreparing: true,
      playbackPositionSeconds: 4,
      playbackState: 'paused',
    });

    assert.equal(summary?.context, 'Loading • 0:04 of 3:05');
  });

  it('shows needs-attention status when playback reports an error', () => {
    const summary = getMiniPlayerSummary({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      isPlaybackPreparing: false,
      playbackPositionSeconds: 4,
      playbackState: 'error',
    });

    assert.equal(summary?.context, 'Needs attention • 0:04 of 3:05');
  });

  it('includes active playlist queue context when playback started from a playlist', () => {
    const summary = getMiniPlayerSummary({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      activePlaylistSession: buildWarmupsPlaybackSession({
        loops: [],
        mode: 'shuffle',
        playlist: buildTrackOnlyWarmupsPlaylist(),
        repeatMode: 'all',
        sources: [PLAYABLE_SOURCE],
      }),
      isPlaybackPreparing: false,
      playbackPositionSeconds: 18,
      playbackState: 'playing',
    });

    assert.equal(
      summary?.context,
      'Playing • Warmups • 1 of 1',
    );
    assert.equal(
      summary?.accessibilityLabel,
      'Now playing: Alto Line.mp3. Playing • 0:18 of 3:05 • Warmups • Item 1 of 1 • Shuffle • Repeat all',
    );
  });

  it('clamps waveform progress within the active playable range', () => {
    assert.equal(
      getPlaybackProgressRatio({
        activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
        playbackPositionSeconds: 400,
      }),
      1,
    );
  });
});
