/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getLoopEditorNudgeAvailability,
  getLoopEditorPlayheadRatio,
  getLoopEditorRegion,
  isLoopEditorBarInRegion,
  resolveLoopEditorHandleDrag,
  resolveLoopEditorSeekTarget,
} from './loop-editor-model.js';

const TRACK_MS = 100_000;
const range = { endMs: 60_000, startMs: 40_000 };

describe('loop editor region', () => {
  it('places the A and B handles as shares of the whole track', () => {
    assert.deepEqual(getLoopEditorRegion(range, TRACK_MS), {
      endRatio: 0.6,
      startRatio: 0.4,
    });
  });

  it('has no region until the track length is known', () => {
    assert.deepEqual(getLoopEditorRegion(range, 0), {
      endRatio: 0,
      startRatio: 0,
    });
  });

  it('counts a bar as inside the loop when any part of it overlaps', () => {
    const region = { endRatio: 0.6, startRatio: 0.4 };
    const inside = Array.from({ length: 10 }, (_, barIndex) => {
      return isLoopEditorBarInRegion({ barCount: 10, barIndex, region });
    });

    assert.deepEqual(inside, [
      false,
      false,
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
  });
});

describe('dragging a loop editor handle', () => {
  it('moves the start to the dragged point and leaves the end alone', () => {
    assert.deepEqual(
      resolveLoopEditorHandleDrag({
        boundary: 'start',
        durationMs: TRACK_MS,
        range,
        ratio: 0.25,
      }),
      { endMs: 60_000, startMs: 25_000 },
    );
  });

  it('snaps to the nudge grid so dragging and nudging agree', () => {
    const result = resolveLoopEditorHandleDrag({
      boundary: 'end',
      durationMs: TRACK_MS,
      range,
      ratio: 0.70013,
    });

    assert.equal(result.endMs % 250, 0);
    assert.equal(result.endMs, 70_000);
  });

  it('stops the start handle short of the end handle', () => {
    assert.deepEqual(
      resolveLoopEditorHandleDrag({
        boundary: 'start',
        durationMs: TRACK_MS,
        range,
        ratio: 0.9,
      }),
      { endMs: 60_000, startMs: 59_750 },
    );
  });

  it('stops the end handle past the start handle', () => {
    assert.deepEqual(
      resolveLoopEditorHandleDrag({
        boundary: 'end',
        durationMs: TRACK_MS,
        range,
        ratio: 0.1,
      }),
      { endMs: 40_250, startMs: 40_000 },
    );
  });

  it('keeps both handles inside the track however far the drag goes', () => {
    assert.equal(
      resolveLoopEditorHandleDrag({
        boundary: 'start',
        durationMs: TRACK_MS,
        range,
        ratio: -3,
      }).startMs,
      0,
    );
    assert.equal(
      resolveLoopEditorHandleDrag({
        boundary: 'end',
        durationMs: TRACK_MS,
        range,
        ratio: 5,
      }).endMs,
      TRACK_MS,
    );
  });
});

describe('loop editor preview controls', () => {
  it('seeks within the previewed range only', () => {
    assert.equal(
      resolveLoopEditorSeekTarget({
        deltaSeconds: 15,
        positionSeconds: 55,
        range,
      }),
      60,
    );
    assert.equal(
      resolveLoopEditorSeekTarget({
        deltaSeconds: -15,
        positionSeconds: 41,
        range,
      }),
      40,
    );
    assert.equal(
      resolveLoopEditorSeekTarget({
        deltaSeconds: 5,
        positionSeconds: 45,
        range,
      }),
      50,
    );
  });

  it('draws the playhead across the whole track, held inside the loop', () => {
    assert.equal(
      getLoopEditorPlayheadRatio({
        durationMs: TRACK_MS,
        positionSeconds: 50,
        range,
      }),
      0.5,
    );
    assert.equal(
      getLoopEditorPlayheadRatio({
        durationMs: TRACK_MS,
        positionSeconds: 5,
        range,
      }),
      0.4,
    );
  });

  it('marks spent nudge buttons at the track edges and at the minimum gap', () => {
    assert.deepEqual(
      getLoopEditorNudgeAvailability({
        range: { endMs: 100_000, startMs: 0 },
        trackDurationMs: TRACK_MS,
      }),
      {
        endEarlier: false,
        endLater: true,
        startEarlier: true,
        startLater: false,
      },
    );
    assert.deepEqual(
      getLoopEditorNudgeAvailability({
        range: { endMs: 10_250, startMs: 10_000 },
        trackDurationMs: null,
      }),
      {
        endEarlier: true,
        endLater: false,
        startEarlier: false,
        startLater: true,
      },
    );
  });
});
