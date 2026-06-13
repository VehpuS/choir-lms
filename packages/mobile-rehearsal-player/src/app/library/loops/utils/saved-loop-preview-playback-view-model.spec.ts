/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import { createLoopPreviewPlayableItem } from './saved-loop-builder-view-model.js';
import { resolveLoopPreviewPlaybackTimeline } from './saved-loop-preview-playback-view-model.js';

describe('saved loop preview playback view-model', () => {
  it('derives preview timeline progress and scrub availability from active preview playback', () => {
    const previewPlayableItem = createLoopPreviewPlayableItem({
      endMs: 18500,
      selectedTrack: createTrackPlayableItem(PLAYABLE_SOURCE),
      startMs: 12000,
    });

    assert.deepEqual(
      resolveLoopPreviewPlaybackTimeline({
        activePlayableItem: previewPlayableItem,
        playbackPositionSeconds: 14,
        previewPlayableItem,
      }),
      {
        canScrub: true,
        elapsedSeconds: 2,
        positionSeconds: 14,
        progressRatio: 2 / 6.5,
        totalDurationSeconds: 6.5,
      },
    );

    assert.deepEqual(
      resolveLoopPreviewPlaybackTimeline({
        activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
        playbackPositionSeconds: 40,
        previewPlayableItem,
      }),
      {
        canScrub: false,
        elapsedSeconds: 0,
        positionSeconds: 12,
        progressRatio: 0,
        totalDurationSeconds: 6.5,
      },
    );
  });
});
