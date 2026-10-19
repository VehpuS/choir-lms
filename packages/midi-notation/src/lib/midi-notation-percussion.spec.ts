import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  drumPosition,
  normalizeHitLengths,
} from './midi-notation-percussion.ts';

describe('drumPosition', () => {
  it('uses the positions of the real score for the sounds it contains', () => {
    // General MIDI note numbers: bass drum, snare, closed and pedal hi-hat,
    // low-mid tom, and ride, as written in the audited MusicXML.
    assert.deepEqual(drumPosition(35), { displayOctave: 4, displayStep: 'E' });
    assert.deepEqual(drumPosition(38), { displayOctave: 5, displayStep: 'C' });
    assert.deepEqual(drumPosition(42), {
      displayOctave: 5,
      displayStep: 'G',
      notehead: 'x',
    });
    assert.deepEqual(drumPosition(44), {
      displayOctave: 4,
      displayStep: 'D',
      notehead: 'x',
    });
    assert.deepEqual(drumPosition(47), { displayOctave: 5, displayStep: 'D' });
    assert.deepEqual(drumPosition(51), {
      displayOctave: 5,
      displayStep: 'F',
      notehead: 'x',
    });
  });

  it('writes cymbals and hi-hats with an x and drums with a normal head', () => {
    for (const note of [42, 44, 46, 49, 51, 57]) {
      assert.equal(drumPosition(note).notehead, 'x', `note ${note}`);
    }

    for (const note of [35, 36, 38, 41, 43, 45, 47, 48, 50]) {
      assert.equal(drumPosition(note).notehead, undefined, `note ${note}`);
    }
  });

  it('gives a note outside the table a position instead of failing', () => {
    const position = drumPosition(90);

    assert.ok(position.displayStep.length === 1);
    assert.ok(position.displayOctave === 4 || position.displayOctave === 5);
  });
});

describe('normalizeHitLengths', () => {
  const hit = (ticks: number, durationTicks: number, midi = 36) => ({
    durationTicks,
    midi,
    ticks,
  });

  it('lasts each hit until the next, at most a quarter note', () => {
    assert.deepEqual(
      normalizeHitLengths([hit(0, 10), hit(120, 10), hit(1200, 10)], 480).map(
        (note) => note.durationTicks,
      ),
      [120, 480, 480],
    );
  });

  it('gives hits that start together the same length so they form one chord', () => {
    const lengths = normalizeHitLengths(
      [hit(0, 30, 36), hit(0, 200, 42), hit(240, 10, 38)],
      480,
    ).map((note) => note.durationTicks);

    assert.deepEqual(lengths, [240, 240, 480]);
  });

  it('leaves the other fields alone and handles no notes', () => {
    assert.deepEqual(normalizeHitLengths([hit(60, 5, 49)], 480), [
      { durationTicks: 480, midi: 49, ticks: 60 },
    ]);
    assert.deepEqual(normalizeHitLengths([], 480), []);
  });
});
