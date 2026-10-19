import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  chooseClef,
  fifthsFromKeyName,
  inferFifths,
  spellPitch,
} from './midi-notation-pitch.ts';

describe('spellPitch', () => {
  it('names natural notes and the octave', () => {
    assert.deepEqual(spellPitch(60, 0), { alter: 0, octave: 4, step: 'C' });
    assert.deepEqual(spellPitch(69, 0), { alter: 0, octave: 4, step: 'A' });
    assert.deepEqual(spellPitch(35, 0), { alter: 0, octave: 1, step: 'B' });
  });

  it('spells black keys with sharps in sharp keys and flats in flat keys', () => {
    assert.deepEqual(spellPitch(61, 2), { alter: 1, octave: 4, step: 'C' });
    assert.deepEqual(spellPitch(61, -2), { alter: -1, octave: 4, step: 'D' });
    assert.deepEqual(spellPitch(70, -1), { alter: -1, octave: 4, step: 'B' });
  });
});

describe('fifthsFromKeyName', () => {
  it('maps the key name the MIDI reader gives to sharps and flats', () => {
    const cases: Array<[string, number]> = [
      ['C', 0],
      ['G', 1],
      ['D', 2],
      ['F', -1],
      ['Eb', -3],
      ['F#', 6],
      ['Cb', -7],
    ];

    for (const [key, fifths] of cases) {
      assert.equal(fifthsFromKeyName(key), fifths, key);
    }
  });

  it('returns undefined for a missing or unknown key', () => {
    assert.equal(fifthsFromKeyName('H'), undefined);
    assert.equal(fifthsFromKeyName(undefined), undefined);
  });
});

describe('inferFifths', () => {
  it('finds the key whose scale holds the notes', () => {
    const dMajor = [62, 64, 66, 67, 69, 71, 73, 74];
    const fMajor = [65, 67, 69, 70, 72, 74, 76, 77];

    assert.equal(inferFifths(dMajor), 2);
    assert.equal(inferFifths(fMajor), -1);
  });

  it('prefers the signature with fewer accidentals on a tie', () => {
    assert.equal(inferFifths([]), 0);
    assert.equal(inferFifths([60, 62, 64, 65, 67, 69, 71]), 0);
  });
});

describe('chooseClef', () => {
  it('uses bass clef for low lines, treble-8 for tenor range, and treble above', () => {
    assert.deepEqual(chooseClef([40, 43, 45, 48, 47]), { line: 4, sign: 'F' });
    assert.deepEqual(chooseClef([55, 57, 59, 60, 58]), {
      line: 2,
      octaveChange: -1,
      sign: 'G',
    });
    assert.deepEqual(chooseClef([67, 69, 71, 72, 74]), { line: 2, sign: 'G' });
  });

  it('writes a baritone line in bass clef and a tenor line in treble-8', () => {
    // Medians 56 (baritone) and 59 (tenor), as in the audited score.
    assert.deepEqual(chooseClef([52, 54, 56, 58, 61]), { line: 4, sign: 'F' });
    assert.deepEqual(chooseClef([56, 57, 59, 62, 66]), {
      line: 2,
      octaveChange: -1,
      sign: 'G',
    });
  });
});
