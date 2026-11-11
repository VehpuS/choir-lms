/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLoopPlayableItem,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import { buildWarmupsPlaybackSession } from '../../library/playlists/utils/saved-playlist-test-fixtures.js';
import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../test-utils/library-test-fixtures.js';
import {
  getMiniPlayerSummary,
  getNowPlayingSurfaceSummary,
} from './shell-model.js';

describe('shell playback summaries', () => {
  it('keeps loop mini-player copy compact without losing accessible context', () => {
    const playableLoop = createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE);
    const customNameSummary = getMiniPlayerSummary({
      activePlayableItem: playableLoop,
      isPlaybackPreparing: false,
      playbackPositionSeconds: 15,
      playbackState: 'playing',
    });

    assert.equal(
      customNameSummary?.context,
      'Playing · Loop from Alto Line.mp3',
    );
    assert.equal(
      customNameSummary?.accessibilityLabel,
      'Now playing: Entrance cue. Playing • 0:03 of 0:06 • Saved loop from Alto Line.mp3 • Single item playback • Loop 0:12 - 0:18',
    );
    const autoNameSummary = getMiniPlayerSummary({
      activePlayableItem: {
        ...playableLoop,
        title: `Loop 0:12 - 0:18 • ${PLAYABLE_SOURCE.name}`,
      },
      isPlaybackPreparing: false,
      playbackPositionSeconds: 15,
      playbackState: 'playing',
    });

    assert.equal(autoNameSummary?.context, 'Playing · Saved loop');
  });

  it('builds now-playing copy with loop context and the queue position', () => {
    const summary = getNowPlayingSurfaceSummary({
      activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
      activePlaylistSession: {
        ...buildWarmupsPlaybackSession({
          repeatMode: 'all',
          sources: [PLAYABLE_SOURCE],
        }),
        currentIndex: 1,
      },
      isPlaybackPreparing: false,
      playbackPositionSeconds: 51,
      playbackState: 'playing',
    });

    assert.deepEqual(summary, {
      collectionLabel: 'Warmups · 2 of 2',
      playbackLabel:
        'Active session • Warmups • item 2 of 2 • Ordered • Repeat all.',
      loopRange: {
        accessibilityLabel: 'Loop 0:12 to 0:18',
        label: '0:12–0:18',
      },
      progressLabel: '0:06 of 0:06',
      shapingLabel: null,
      statusLabel: 'Playing',
      supportsQueueNavigation: true,
      title: 'Entrance cue',
      waveformProgressRatio: 1,
    });
  });

  it('builds standalone now-playing copy without queue navigation', () => {
    const summary = getNowPlayingSurfaceSummary({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      isPlaybackPreparing: false,
      playbackPositionSeconds: 20,
      playbackState: 'paused',
    });

    assert.deepEqual(summary, {
      collectionLabel: null,
      playbackLabel:
        'Keep the current rehearsal item audible while moving between tabs.',
      progressLabel: '0:20 of 3:05',
      loopRange: null,
      shapingLabel: null,
      statusLabel: 'Paused',
      supportsQueueNavigation: false,
      title: 'Alto Line.mp3',
      waveformProgressRatio: 20 / 185,
    });
  });
  describe('a playlist with a right-to-left name', () => {
    const HEBREW_NAME = 'אור-פנד-לנד-2026-12-09';
    const rightToLeftSession = () => {
      const session = buildWarmupsPlaybackSession({
        sources: [PLAYABLE_SOURCE],
      });

      return { ...session, playlistName: HEBREW_NAME };
    };

    it('isolates the name in the now-playing collection label', () => {
      const summary = getNowPlayingSurfaceSummary({
        activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
        activePlaylistSession: rightToLeftSession(),
        isPlaybackPreparing: false,
        playbackPositionSeconds: 0,
        playbackState: 'playing',
      });

      // The isolate keeps the line left-to-right and the name in one piece.
      assert.equal(
        summary?.collectionLabel,
        `\u2068${HEBREW_NAME}\u2069 · 1 of 2`,
      );
    });

    it('isolates the name in the mini-player context', () => {
      const summary = getMiniPlayerSummary({
        activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
        activePlaylistSession: rightToLeftSession(),
        isPlaybackPreparing: false,
        playbackPositionSeconds: 0,
        playbackState: 'playing',
      });

      assert.ok(
        summary?.context?.includes(`\u2068${HEBREW_NAME}\u2069 · 1 of 2`),
      );
    });

    it('adds no invisible characters for an English name', () => {
      const summary = getNowPlayingSurfaceSummary({
        activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
        activePlaylistSession: buildWarmupsPlaybackSession({
          sources: [PLAYABLE_SOURCE],
        }),
        isPlaybackPreparing: false,
        playbackPositionSeconds: 0,
        playbackState: 'playing',
      });

      assert.equal(summary?.collectionLabel, 'Warmups · 1 of 2');
    });
  });
});
