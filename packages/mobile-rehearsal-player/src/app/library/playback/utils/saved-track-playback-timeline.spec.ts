/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLoopPlayableItem,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../../test-utils/library-test-fixtures.js';
import {
  hasSavedTrackPlaybackReachedRangeEnd,
  hydratePlayableItemDuration,
  normalizePlaybackVolumeLevel,
  resolvePlaybackScrubPositionSeconds,
  resolvePlaybackSeekPositionSeconds,
} from './saved-track-playback-view-model.js';

describe('saved track playback timeline helpers', () => {
  it('detects when loop playback reaches the saved range end', () => {
    assert.equal(
      hasSavedTrackPlaybackReachedRangeEnd({
        activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
        playbackState: 'playing',
        positionSeconds: 18.5,
      }),
      true,
    );
    assert.equal(
      hasSavedTrackPlaybackReachedRangeEnd({
        activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
        playbackState: 'playing',
        positionSeconds: 18.5,
      }),
      false,
    );
  });

  it('hydrates missing full-track duration from player progress for preview playback', () => {
    const playableItem = createTrackPlayableItem({
      ...PLAYABLE_SOURCE,
      durationMs: undefined,
    });

    assert.deepEqual(
      hydratePlayableItemDuration({
        durationSeconds: 185,
        playableItem,
      }),
      {
        ...playableItem,
        source: {
          ...playableItem.source,
          durationMs: 185000,
        },
        range: {
          ...playableItem.range,
          endMs: 185000,
        },
      },
    );
  });

  it('leaves resolved or loop durations unchanged when hydrating progress', () => {
    const resolvedTrack = createTrackPlayableItem(PLAYABLE_SOURCE);
    const loopPlayableItem = createLoopPlayableItem(
      SAVED_LOOP,
      PLAYABLE_SOURCE,
    );

    assert.equal(
      hydratePlayableItemDuration({
        durationSeconds: 185,
        playableItem: resolvedTrack,
      }),
      resolvedTrack,
    );
    assert.equal(
      hydratePlayableItemDuration({
        durationSeconds: 185,
        playableItem: loopPlayableItem,
      }),
      loopPlayableItem,
    );
  });

  it('bounds seek jumps within the active item range', () => {
    assert.equal(
      resolvePlaybackSeekPositionSeconds({
        activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
        currentPositionSeconds: 30,
        deltaSeconds: -45,
      }),
      0,
    );
    assert.equal(
      resolvePlaybackSeekPositionSeconds({
        activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
        currentPositionSeconds: 180,
        deltaSeconds: 15,
      }),
      185,
    );
    assert.equal(
      resolvePlaybackSeekPositionSeconds({
        activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
        currentPositionSeconds: 15,
        deltaSeconds: -10,
      }),
      12,
    );
    assert.equal(
      resolvePlaybackSeekPositionSeconds({
        activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
        currentPositionSeconds: 15,
        deltaSeconds: 10,
      }),
      18.5,
    );
  });

  it('bounds scrub positions within the active item range', () => {
    assert.equal(
      resolvePlaybackScrubPositionSeconds({
        activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
        requestedPositionSeconds: -8,
      }),
      0,
    );
    assert.equal(
      resolvePlaybackScrubPositionSeconds({
        activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
        requestedPositionSeconds: 30,
      }),
      18.5,
    );
  });

  it('normalizes playback volume levels into the supported range', () => {
    assert.equal(normalizePlaybackVolumeLevel(-0.2), 0);
    assert.equal(normalizePlaybackVolumeLevel(0.45), 0.45);
    assert.equal(normalizePlaybackVolumeLevel(1.8), 1);
    assert.equal(normalizePlaybackVolumeLevel(Number.NaN), 1);
  });
});
