import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  INITIAL_MARKER_PICK_STATE,
  getInvalidRangeMessage,
  pickMarker,
  toggleArmedBoundary,
} from './loop-editor-marker-picking';

const RANGE = { startMs: 10_000, endMs: 60_000 };

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

describe('pickMarker', () => {
  it('sets the start from a marker without moving the end, then disarms', () => {
    assert.deepEqual(
      pickMarker({
        positionMs: 20_000,
        range: RANGE,
        state: { armed: 'start' },
      }),
      {
        range: { startMs: 20_000, endMs: 60_000 },
        state: INITIAL_MARKER_PICK_STATE,
      },
    );
  });

  it('sets the end from a marker without moving the start', () => {
    assert.deepEqual(
      pickMarker({
        positionMs: 45_000,
        range: RANGE,
        state: { armed: 'end' },
      }).range,
      { startMs: 10_000, endMs: 45_000 },
    );
  });

  it('changes nothing when no card is armed', () => {
    const state = INITIAL_MARKER_PICK_STATE;

    assert.deepEqual(pickMarker({ positionMs: 20_000, range: RANGE, state }), {
      range: RANGE,
      state,
    });
  });

  it('leaves an invalid range when the start lands after the end', () => {
    const { range } = pickMarker({
      positionMs: 80_000,
      range: RANGE,
      state: { armed: 'start' },
    });

    assert.deepEqual(range, { startMs: 80_000, endMs: 60_000 });
    assert.equal(
      getInvalidRangeMessage(range),
      'Loop end must be after the loop start.',
    );
  });

  it('leaves an invalid range when the end lands on the start', () => {
    const { range } = pickMarker({
      positionMs: 10_000,
      range: RANGE,
      state: { armed: 'end' },
    });

    assert.equal(range.startMs, range.endMs);
    assert.ok(getInvalidRangeMessage(range));
  });

  it('keeps the pick inside the track', () => {
    assert.equal(
      pickMarker({
        durationMs: 90_000,
        positionMs: 120_000,
        range: RANGE,
        state: { armed: 'end' },
      }).range.endMs,
      90_000,
    );
    assert.equal(
      pickMarker({
        positionMs: -5,
        range: RANGE,
        state: { armed: 'start' },
      }).range.startMs,
      0,
    );
  });
});

describe('getInvalidRangeMessage', () => {
  it('is silent for a usable range', () => {
    assert.equal(getInvalidRangeMessage(RANGE, 120_000), null);
  });
});
