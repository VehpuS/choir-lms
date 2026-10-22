import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MARKER_NAME_EMPTY_MESSAGE,
  MARKER_NUDGE_STEPS,
  MARKER_TIME_INVALID_MESSAGE,
  MARKER_TIME_PAST_END_MESSAGE,
  clampMarkerPosition,
  nudgeMarkerPosition,
  parseMarkerTimeInput,
  validateMarkerNameInput,
} from './edit-model';

describe('nudgeMarkerPosition', () => {
  it('offers the four documented steps', () => {
    assert.deepEqual(
      MARKER_NUDGE_STEPS.map((step) => step.deltaMs),
      [-1000, -100, 100, 1000],
    );
  });

  it('moves by the step', () => {
    assert.equal(nudgeMarkerPosition(72_400, 100), 72_500);
    assert.equal(nudgeMarkerPosition(72_400, -1000), 71_400);
  });

  it('stops at zero and at the track length', () => {
    assert.equal(nudgeMarkerPosition(50, -1000), 0);
    assert.equal(nudgeMarkerPosition(9_950, 1000, 10_000), 10_000);
  });

  it('lets a marker past the end move back but not further out', () => {
    assert.equal(nudgeMarkerPosition(12_000, 1000, 10_000), 10_000);
    assert.equal(nudgeMarkerPosition(12_000, -1000, 10_000), 10_000);
  });
});

describe('clampMarkerPosition', () => {
  it('rounds to whole milliseconds and bounds the position', () => {
    assert.equal(clampMarkerPosition(1234.6), 1235);
    assert.equal(clampMarkerPosition(-5), 0);
    assert.equal(clampMarkerPosition(20_000, 10_000), 10_000);
  });
});

describe('parseMarkerTimeInput', () => {
  it('reads minutes, seconds, and tenths', () => {
    assert.deepEqual(parseMarkerTimeInput('1:12.4'), {
      isValid: true,
      positionMs: 72_400,
    });
  });

  it('reads plain seconds and padded minutes', () => {
    assert.deepEqual(parseMarkerTimeInput(' 45 '), {
      isValid: true,
      positionMs: 45_000,
    });
    assert.deepEqual(parseMarkerTimeInput('02:05'), {
      isValid: true,
      positionMs: 125_000,
    });
  });

  it('reads one to three decimals as a fraction of a second', () => {
    assert.deepEqual(parseMarkerTimeInput('0:01.25'), {
      isValid: true,
      positionMs: 1_250,
    });
    assert.deepEqual(parseMarkerTimeInput('0:01.005'), {
      isValid: true,
      positionMs: 1_005,
    });
  });

  it('refuses text that is not a time', () => {
    for (const text of ['', 'abc', '1:2:3', '-3', '1:60', '1.', ':30']) {
      assert.deepEqual(parseMarkerTimeInput(text), {
        isValid: false,
        error: MARKER_TIME_INVALID_MESSAGE,
      });
    }
  });

  it('refuses a time beyond a known track length', () => {
    assert.deepEqual(parseMarkerTimeInput('1:00', 59_000), {
      isValid: false,
      error: MARKER_TIME_PAST_END_MESSAGE,
    });
    assert.deepEqual(parseMarkerTimeInput('1:00', 60_000), {
      isValid: true,
      positionMs: 60_000,
    });
  });
});

describe('validateMarkerNameInput', () => {
  it('trims the name', () => {
    assert.deepEqual(validateMarkerNameInput('  Chorus  '), {
      isValid: true,
      name: 'Chorus',
    });
  });

  it('refuses an empty name', () => {
    assert.deepEqual(validateMarkerNameInput('   '), {
      isValid: false,
      error: MARKER_NAME_EMPTY_MESSAGE,
    });
  });

  it('caps a long name at 60 characters', () => {
    const result = validateMarkerNameInput('x'.repeat(80));

    assert.equal(result.isValid && result.name.length, 60);
  });
});
