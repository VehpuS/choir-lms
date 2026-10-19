import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MIN_TAPPED_NOTE_MS,
  nearestNotehead,
  remainingAudibleMs,
} from './score-note-hit-test.js';

const box = (midi: number, left: number, top = 0) => ({
  midi,
  left,
  top,
  right: left + 10,
  bottom: top + 8,
});

describe('notehead hit-testing', () => {
  const boxes = [box(60, 100), box(62, 140), box(64, 180)];

  it('finds the notehead under the tap', () => {
    assert.equal(nearestNotehead(boxes, 145, 4)?.midi, 62);
  });

  it('forgives a tap just beside a notehead', () => {
    // 6 px to the left of the 62 notehead.
    assert.equal(nearestNotehead(boxes, 134, 4)?.midi, 62);
  });

  it('ignores a tap on empty staff', () => {
    assert.equal(nearestNotehead(boxes, 120, 4, 5), undefined);
    assert.equal(nearestNotehead([], 10, 10), undefined);
  });

  it('prefers the nearer of two heads in reach', () => {
    const chord = [box(60, 100, 0), box(62, 100, 14)];

    assert.equal(nearestNotehead(chord, 105, 13)?.midi, 62);
    assert.equal(nearestNotehead(chord, 105, 9)?.midi, 60);
  });
});

describe('tapped note duration', () => {
  it('holds a quick tap up to the minimum and lets a long one go at once', () => {
    assert.equal(remainingAudibleMs(1000, 1100), MIN_TAPPED_NOTE_MS - 100);
    assert.equal(remainingAudibleMs(1000, 1000 + MIN_TAPPED_NOTE_MS), 0);
    assert.equal(remainingAudibleMs(1000, 4000), 0);
  });
});
