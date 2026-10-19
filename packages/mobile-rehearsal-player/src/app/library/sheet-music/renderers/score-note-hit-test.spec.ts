import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MIN_TAPPED_NOTE_MS,
  nearestNotehead,
  readNoteheadBoxes,
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

describe('notehead boxes', () => {
  // Like a browser DOMRect, the fields are getters on the prototype.
  class FakeDomRect {
    get bottom() {
      return 18;
    }
    get left() {
      return 100;
    }
    get right() {
      return 110;
    }
    get top() {
      return 10;
    }
  }
  const head = (value: string | null) => ({
    getAttribute: () => value,
    getBoundingClientRect: () => new FakeDomRect(),
  });

  it('copies a getter-based rect into a hit-testable box', () => {
    const [box] = readNoteheadBoxes([head('68')], 'data-midi');

    assert.deepEqual(
      { ...box, head: undefined },
      { bottom: 18, head: undefined, left: 100, midi: 68, right: 110, top: 10 },
    );
    assert.equal(nearestNotehead([box], 105, 14)?.midi, 68);
  });

  it('drops elements whose tag is missing or not a number', () => {
    assert.deepEqual(
      readNoteheadBoxes(
        [head(null), head('x'), head(''), head('64')],
        'data-midi',
      ).map(({ midi }) => midi),
      [64],
    );
  });
});
