import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BLACK_KEY_WIDTH,
  centredScrollOffset,
  middleCScrollOffset,
  PIANO_BLACK_KEYS,
  PIANO_KEYS,
  PIANO_STRIP_WIDTH,
  PIANO_WHITE_KEYS,
  pianoKeyLabel,
  WHITE_KEY_WIDTH,
} from './keyboard-layout.js';

const defaults = { showAllNoteNames: false, accidentals: 'sharps' } as const;

describe('keyboard layout', () => {
  it('has 88 keys, 52 white and 36 black, in pitch order', () => {
    assert.equal(PIANO_KEYS.length, 88);
    assert.equal(PIANO_WHITE_KEYS.length, 52);
    assert.equal(PIANO_BLACK_KEYS.length, 36);
    assert.equal(PIANO_KEYS[0].midi, 21);
    assert.equal(PIANO_KEYS[87].midi, 108);
  });

  it('lays white keys edge to edge and black keys on the boundaries', () => {
    assert.equal(PIANO_STRIP_WIDTH, 52 * WHITE_KEY_WIDTH);
    assert.equal(PIANO_WHITE_KEYS[1].left, WHITE_KEY_WIDTH);

    // A♯0 sits on the boundary between A0 and B0.
    const [aSharp] = PIANO_BLACK_KEYS;

    assert.equal(aSharp.midi, 22);
    assert.equal(aSharp.left + BLACK_KEY_WIDTH / 2, WHITE_KEY_WIDTH);
  });
});

describe('key labels', () => {
  it('labels only C keys, with octave, by default', () => {
    assert.equal(pianoKeyLabel(60, defaults), 'C4');
    assert.equal(pianoKeyLabel(62, defaults), null);
    assert.equal(pianoKeyLabel(61, defaults), null);
  });

  it('labels every key in the chosen spelling when asked', () => {
    const all = { showAllNoteNames: true, accidentals: 'flats' } as const;

    assert.equal(pianoKeyLabel(60, all), 'C4');
    assert.equal(pianoKeyLabel(62, all), 'D');
    assert.equal(pianoKeyLabel(70, all), 'B♭');
    assert.equal(pianoKeyLabel(70, { ...all, accidentals: 'sharps' }), 'A♯');
  });
});

describe('centred scroll offset', () => {
  const viewport = 400;

  it('centres a range in the viewport', () => {
    // A3 (57) to E5 (76) is well inside the strip, so it centres exactly.
    const offset = centredScrollOffset({ lowest: 57, highest: 76 }, viewport);
    const lowKey = PIANO_KEYS[57 - 21];
    const highKey = PIANO_KEYS[76 - 21];
    const centre = (lowKey.left + highKey.left + WHITE_KEY_WIDTH) / 2;

    assert.equal(offset, centre - viewport / 2);
  });

  it('stops at the low end', () => {
    assert.equal(centredScrollOffset({ lowest: 21, highest: 23 }, viewport), 0);
  });

  it('stops at the high end', () => {
    assert.equal(
      centredScrollOffset({ lowest: 106, highest: 108 }, viewport),
      PIANO_STRIP_WIDTH - viewport,
    );
  });

  it('does not scroll when the viewport is wider than the strip', () => {
    assert.equal(middleCScrollOffset(PIANO_STRIP_WIDTH + 100), 0);
  });

  it('opens middle C about centred', () => {
    const offset = middleCScrollOffset(viewport);
    const c4 = PIANO_KEYS[60 - 21];

    assert.equal(offset + viewport / 2, c4.left + c4.width / 2);
  });
});
