import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SEGMENTING_THRESHOLD_BARS,
  computeScrollAdjustment,
  estimateBarWidth,
  findSegmentForBar,
  layoutOffsets,
  planSegments,
  selectSegmentsToDraw,
  selectSegmentsToRelease,
  shouldSegment,
} from './strip-segments';

describe('shouldSegment', () => {
  it('draws a common arrangement as one strip and only long scores in runs', () => {
    assert.equal(shouldSegment(40), false);
    assert.equal(shouldSegment(SEGMENTING_THRESHOLD_BARS), false);
    assert.equal(shouldSegment(SEGMENTING_THRESHOLD_BARS + 1), true);
  });
});

describe('planSegments', () => {
  it('splits bars into runs of 32 with a shorter last run', () => {
    const segments = planSegments(70);

    assert.deepEqual(
      segments.map(({ firstBar, lastBar, barCount }) => [
        firstBar,
        lastBar,
        barCount,
      ]),
      [
        [1, 32, 32],
        [33, 64, 32],
        [65, 70, 6],
      ],
    );
    assert.deepEqual(
      segments.map(({ index }) => index),
      [0, 1, 2],
    );
  });

  it('plans nothing for no bars and one run for a few', () => {
    assert.deepEqual(planSegments(0), []);
    assert.equal(planSegments(5).length, 1);
  });

  it('finds the run holding a bar, or nothing out of range', () => {
    const segments = planSegments(70);

    assert.equal(findSegmentForBar(segments, 1), 0);
    assert.equal(findSegmentForBar(segments, 33), 1);
    assert.equal(findSegmentForBar(segments, 70), 2);
    assert.equal(findSegmentForBar(segments, 71), undefined);
    assert.equal(findSegmentForBar(segments, 0), undefined);
  });
});

describe('estimateBarWidth and layoutOffsets', () => {
  it('averages the width of a bar over the runs measured', () => {
    assert.equal(
      estimateBarWidth([
        { barCount: 32, width: 3200 },
        { barCount: 8, width: 1000 },
      ]),
      105,
    );
    assert.equal(estimateBarWidth([]), undefined);
  });

  it('places each run after the one before it', () => {
    assert.deepEqual(layoutOffsets([100, 250, 50]), [0, 100, 350]);
    assert.deepEqual(layoutOffsets([]), []);
  });
});

describe('selectSegmentsToDraw', () => {
  const widths = [1000, 1000, 1000, 1000, 1000, 1000];

  it('draws only the runs in or near the viewport window', () => {
    assert.deepEqual(
      selectSegmentsToDraw({
        lookaheadViewports: 0.5,
        scrollLeft: 2200,
        viewportWidth: 400,
        widths,
      }),
      [2],
    );
  });

  it('orders on-screen, then ahead, then behind', () => {
    assert.deepEqual(
      selectSegmentsToDraw({
        lookaheadViewports: 2,
        scrollLeft: 2500,
        viewportWidth: 400,
        widths,
      }),
      [2, 3, 1],
    );
  });

  it('draws the first run at the start', () => {
    assert.deepEqual(
      selectSegmentsToDraw({
        lookaheadViewports: 1,
        scrollLeft: 0,
        viewportWidth: 600,
        widths,
      }),
      [0, 1],
    );
  });
});

describe('selectSegmentsToRelease', () => {
  it('releases drawn runs more than the keep distance from every wanted run', () => {
    assert.deepEqual(
      selectSegmentsToRelease({
        drawn: [0, 1, 4, 5, 9],
        keepDistance: 2,
        wanted: [5, 6],
      }),
      [0, 1, 9],
    );
  });

  it('keeps everything while all are near', () => {
    assert.deepEqual(
      selectSegmentsToRelease({
        drawn: [2, 3],
        keepDistance: 3,
        wanted: [3],
      }),
      [],
    );
  });
});

describe('computeScrollAdjustment', () => {
  it('moves the scroll by the change in every run left of the viewport', () => {
    assert.equal(
      computeScrollAdjustment({
        newWidths: [1120, 950, 1000],
        oldWidths: [1000, 1000, 1000],
        scrollLeft: 2100,
      }),
      70,
    );
  });

  it('moves it back when runs shrink', () => {
    assert.equal(
      computeScrollAdjustment({
        newWidths: [900, 1000, 1000],
        oldWidths: [1000, 1000, 1000],
        scrollLeft: 1500,
      }),
      -100,
    );
  });

  it('leaves the scroll alone for runs at or right of the viewport edge', () => {
    assert.equal(
      computeScrollAdjustment({
        newWidths: [1000, 1200, 1300],
        oldWidths: [1000, 1000, 1000],
        scrollLeft: 1000,
      }),
      0,
    );
    assert.equal(
      computeScrollAdjustment({
        newWidths: [1200, 1000, 1000],
        oldWidths: [1000, 1000, 1000],
        scrollLeft: 0,
      }),
      0,
    );
  });
});
