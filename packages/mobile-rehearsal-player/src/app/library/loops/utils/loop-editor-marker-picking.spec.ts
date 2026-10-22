import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  INITIAL_MARKER_PICK_STATE,
  classifyMarkerPick,
  describeMarkerPickConflict,
  resolvePickedRange,
  toggleArmedBoundary,
} from './loop-editor-marker-picking';

const RANGE = { startMs: 10_000, endMs: 60_000 };
const DURATION_MS = 120_000;
const formatTime = (ms: number) => `${ms / 1000}s`;

describe('toggleArmedBoundary', () => {
  it('arms a card, switches to the other, and disarms the armed one', () => {
    const armedStart = toggleArmedBoundary(INITIAL_MARKER_PICK_STATE, 'start');

    assert.deepEqual(armedStart, { armed: 'start' });
    assert.deepEqual(toggleArmedBoundary(armedStart, 'end'), { armed: 'end' });
    assert.deepEqual(toggleArmedBoundary(armedStart, 'start'), {
      armed: null,
    });
  });
});

describe('classifyMarkerPick', () => {
  const classify = (
    armed: 'start' | 'end',
    positionMs: number,
    durationMs: number | undefined = DURATION_MS,
  ) => classifyMarkerPick({ armed, durationMs, positionMs, range: RANGE });

  it('accepts a start before the end and an end after the start', () => {
    assert.deepEqual(classify('start', 20_000), { kind: 'valid' });
    assert.deepEqual(classify('end', 45_000), { kind: 'valid' });
  });

  it('offers moving the end to the track end for a start after the end', () => {
    assert.deepEqual(classify('start', 80_000), {
      fix: { boundary: 'end', positionMs: DURATION_MS },
      kind: 'conflict',
    });
  });

  it('offers moving the start to the track start for an end before the start', () => {
    assert.deepEqual(classify('end', 5_000), {
      fix: { boundary: 'start', positionMs: 0 },
      kind: 'conflict',
    });
  });

  it('treats a pick equal to the other edge as a conflict', () => {
    assert.equal(classify('start', 60_000).kind, 'conflict');
    assert.equal(classify('end', 10_000).kind, 'conflict');
  });

  it('offers no fix when moving the other edge cannot make room', () => {
    // An end at the very start of the track leaves nothing before it.
    assert.deepEqual(classify('end', 0), { fix: null, kind: 'conflict' });
    // A start at the very end of the track leaves nothing after it.
    assert.deepEqual(classify('start', DURATION_MS), {
      fix: null,
      kind: 'conflict',
    });
  });

  it('offers no end fix while the track length is unknown', () => {
    assert.deepEqual(
      classifyMarkerPick({
        armed: 'start',
        positionMs: 80_000,
        range: RANGE,
      }),
      { fix: null, kind: 'conflict' },
    );
  });
});

describe('resolvePickedRange', () => {
  it('sets only the armed edge for a valid pick', () => {
    assert.deepEqual(
      resolvePickedRange({ armed: 'start', positionMs: 20_000, range: RANGE }),
      { startMs: 20_000, endMs: 60_000 },
    );
    assert.deepEqual(
      resolvePickedRange({ armed: 'end', positionMs: 45_000, range: RANGE }),
      { startMs: 10_000, endMs: 45_000 },
    );
  });

  it('applies the fix to the other edge as well', () => {
    assert.deepEqual(
      resolvePickedRange({
        armed: 'start',
        fix: { boundary: 'end', positionMs: DURATION_MS },
        positionMs: 80_000,
        range: RANGE,
      }),
      { startMs: 80_000, endMs: DURATION_MS },
    );
    assert.deepEqual(
      resolvePickedRange({
        armed: 'end',
        fix: { boundary: 'start', positionMs: 0 },
        positionMs: 5_000,
        range: RANGE,
      }),
      { startMs: 0, endMs: 5_000 },
    );
  });

  it('keeps the pick inside the track', () => {
    assert.equal(
      resolvePickedRange({
        armed: 'end',
        durationMs: 90_000,
        positionMs: 120_000,
        range: RANGE,
      }).endMs,
      90_000,
    );
    assert.equal(
      resolvePickedRange({ armed: 'start', positionMs: -5, range: RANGE })
        .startMs,
      0,
    );
  });
});

describe('describeMarkerPickConflict', () => {
  it('explains an end before the start and offers the start fix', () => {
    const text = describeMarkerPickConflict(
      {
        armed: 'end',
        fix: { boundary: 'start', positionMs: 0 },
        marker: { name: 'Chorus', positionMs: 5_000 },
      },
      RANGE,
      formatTime,
    );

    assert.match(
      text.message,
      /Chorus \(5s\) is at or before the loop start \(10s\)/,
    );
    assert.equal(text.fixLabel, 'Move start to the track start (0s)');
  });

  it('explains a start after the end and offers the end fix', () => {
    const text = describeMarkerPickConflict(
      {
        armed: 'start',
        fix: { boundary: 'end', positionMs: DURATION_MS },
        marker: { name: 'Bridge', positionMs: 80_000 },
      },
      RANGE,
      formatTime,
    );

    assert.match(
      text.message,
      /Bridge \(80s\) is at or after the loop end \(60s\)/,
    );
    assert.equal(text.fixLabel, 'Move end to the track end (120s)');
  });

  it('tells the user to pick another marker when there is no fix', () => {
    const text = describeMarkerPickConflict(
      {
        armed: 'end',
        fix: null,
        marker: { name: 'Intro', positionMs: 0 },
      },
      RANGE,
      formatTime,
    );

    assert.equal(text.fixLabel, null);
    assert.match(text.message, /pick another marker/);
  });
});
