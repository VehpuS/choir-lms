/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import {
  createLoopPreviewPlayableItem,
  nudgeLoopBuilderBoundary,
  resolveLoopBuilderBoundaryFromPlaybackPosition,
  resolveLoopBuilderRangeSelection,
} from './saved-loop-builder-view-model.js';

describe('saved loop builder range view-model', () => {
  it('normalizes dual-thumb slider values into an ordered, bounded loop range', () => {
    assert.deepEqual(
      resolveLoopBuilderRangeSelection({
        durationMs: 18000,
        sliderValue: [15, 24],
      }),
      {
        startMs: 15000,
        endMs: 18000,
      },
    );

    assert.deepEqual(
      resolveLoopBuilderRangeSelection({
        durationMs: 18000,
        sliderValue: [12, 4],
      }),
      {
        startMs: 4000,
        endMs: 12000,
      },
    );
  });

  it('creates a preview playable item from the draft loop range', () => {
    const previewPlayableItem = createLoopPreviewPlayableItem({
      endMs: 18500,
      selectedTrack: createTrackPlayableItem(PLAYABLE_SOURCE),
      startMs: 12000,
    });

    assert.equal(previewPlayableItem.kind, 'loop');
    assert.equal(
      previewPlayableItem.id,
      `loop-preview:${PLAYABLE_SOURCE.id}:12000:18500`,
    );
    assert.deepEqual(previewPlayableItem.range, {
      startMs: 12000,
      endMs: 18500,
    });
  });

  it('nudges the loop start boundary by the step size within a minimum gap of the end', () => {
    assert.deepEqual(
      nudgeLoopBuilderBoundary({
        boundary: 'start',
        currentEndMs: 20000,
        currentStartMs: 10000,
        direction: 'later',
      }),
      { endMs: 20000, startMs: 10250 },
    );

    assert.deepEqual(
      nudgeLoopBuilderBoundary({
        boundary: 'start',
        currentEndMs: 20000,
        currentStartMs: 10000,
        direction: 'earlier',
      }),
      { endMs: 20000, startMs: 9750 },
    );

    assert.deepEqual(
      nudgeLoopBuilderBoundary({
        boundary: 'start',
        currentEndMs: 20000,
        currentStartMs: 19900,
        direction: 'later',
      }),
      { endMs: 20000, startMs: 19750 },
    );

    assert.deepEqual(
      nudgeLoopBuilderBoundary({
        boundary: 'start',
        currentEndMs: 20000,
        currentStartMs: 100,
        direction: 'earlier',
      }),
      { endMs: 20000, startMs: 0 },
    );
  });

  it('nudges the loop end boundary by the step size within track duration and a minimum gap of the start', () => {
    assert.deepEqual(
      nudgeLoopBuilderBoundary({
        boundary: 'end',
        currentEndMs: 20000,
        currentStartMs: 10000,
        direction: 'later',
        durationMs: 25000,
      }),
      { endMs: 20250, startMs: 10000 },
    );

    assert.deepEqual(
      nudgeLoopBuilderBoundary({
        boundary: 'end',
        currentEndMs: 24900,
        currentStartMs: 10000,
        direction: 'later',
        durationMs: 25000,
      }),
      { endMs: 25000, startMs: 10000 },
    );

    assert.deepEqual(
      nudgeLoopBuilderBoundary({
        boundary: 'end',
        currentEndMs: 10200,
        currentStartMs: 10000,
        direction: 'earlier',
      }),
      { endMs: 10250, startMs: 10000 },
    );
  });

  it('captures the live preview position into a loop boundary while preserving a minimum gap', () => {
    assert.deepEqual(
      resolveLoopBuilderBoundaryFromPlaybackPosition({
        boundary: 'start',
        currentEndMs: 20000,
        currentStartMs: 10000,
        positionSeconds: 14.6,
      }),
      { endMs: 20000, startMs: 14600 },
    );

    assert.deepEqual(
      resolveLoopBuilderBoundaryFromPlaybackPosition({
        boundary: 'start',
        currentEndMs: 20000,
        currentStartMs: 10000,
        positionSeconds: 19.9,
      }),
      { endMs: 20000, startMs: 19750 },
    );

    assert.deepEqual(
      resolveLoopBuilderBoundaryFromPlaybackPosition({
        boundary: 'end',
        currentEndMs: 20000,
        currentStartMs: 10000,
        durationMs: 25000,
        positionSeconds: 16.2,
      }),
      { endMs: 16200, startMs: 10000 },
    );

    assert.deepEqual(
      resolveLoopBuilderBoundaryFromPlaybackPosition({
        boundary: 'end',
        currentEndMs: 20000,
        currentStartMs: 10000,
        positionSeconds: 10.1,
      }),
      { endMs: 10250, startMs: 10000 },
    );
  });
});
