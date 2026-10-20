import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BLACK_KEY_WIDTH,
  centredScrollOffset,
  clampWhiteKeyWidth,
  createKeyboardLayout,
  DEFAULT_KEYBOARD_LAYOUT,
  MAX_WHITE_KEY_WIDTH,
  MIN_WHITE_KEY_WIDTH,
  middleCScrollOffset,
  PIANO_BLACK_KEYS,
  PIANO_KEYS,
  PIANO_STRIP_WIDTH,
  PIANO_WHITE_KEYS,
  pianoKeyLabel,
  rescaledScrollOffset,
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

describe('key width', () => {
  it('defaults to the narrowest width, 40 pt', () => {
    assert.equal(DEFAULT_KEYBOARD_LAYOUT.whiteKeyWidth, 40);
    assert.equal(MIN_WHITE_KEY_WIDTH, 40);
    assert.equal(WHITE_KEY_WIDTH, 40);
    assert.equal(BLACK_KEY_WIDTH, 26);
  });

  it('clamps a width into 40-100 pt and gives a non-number the default', () => {
    assert.equal(clampWhiteKeyWidth(10), MIN_WHITE_KEY_WIDTH);
    assert.equal(clampWhiteKeyWidth(500), MAX_WHITE_KEY_WIDTH);
    assert.equal(clampWhiteKeyWidth(64), 64);
    assert.equal(clampWhiteKeyWidth(Number.NaN), MIN_WHITE_KEY_WIDTH);
  });

  it('scales the strip and the black keys with the white key width', () => {
    const wide = createKeyboardLayout(80);

    assert.equal(wide.stripWidth, 52 * 80);
    assert.equal(wide.whiteKeys[1].left, 80);
    assert.equal(wide.blackKeyWidth, 52);

    // A♯0 still sits on the boundary between A0 and B0.
    const [aSharp] = wide.blackKeys;

    assert.equal(aSharp.left + wide.blackKeyWidth / 2, 80);
    assert.equal(wide.keys.length, 88);
  });

  it('lays out a requested width outside the range as the nearest allowed one', () => {
    assert.equal(createKeyboardLayout(500).whiteKeyWidth, MAX_WHITE_KEY_WIDTH);
    assert.equal(createKeyboardLayout(1).whiteKeyWidth, MIN_WHITE_KEY_WIDTH);
  });

  it('centres a note on the wider layout', () => {
    const wide = createKeyboardLayout(80);
    const offset = middleCScrollOffset(400, wide);
    const c4 = wide.keys[60 - 21];

    assert.equal(offset + 200, c4.left + c4.width / 2);
  });
});

describe('rescaled scroll offset', () => {
  const viewport = 400;
  const narrow = createKeyboardLayout(40);
  const wide = createKeyboardLayout(80);

  it('keeps the key at the centre of the view at the centre', () => {
    const before = middleCScrollOffset(viewport, narrow);
    const after = rescaledScrollOffset({
      from: narrow,
      scrollLeft: before,
      to: wide,
      viewportWidth: viewport,
    });
    const c4 = wide.keys[60 - 21];

    assert.equal(after + viewport / 2, c4.left + c4.width / 2);
  });

  it('round-trips when the width goes back', () => {
    const before = middleCScrollOffset(viewport, narrow);
    const there = rescaledScrollOffset({
      from: narrow,
      scrollLeft: before,
      to: wide,
      viewportWidth: viewport,
    });
    const back = rescaledScrollOffset({
      from: wide,
      scrollLeft: there,
      to: narrow,
      viewportWidth: viewport,
    });

    assert.ok(Math.abs(back - before) < 1e-9);
  });

  it('stays at the low end', () => {
    assert.equal(
      rescaledScrollOffset({
        from: narrow,
        scrollLeft: 0,
        to: wide,
        viewportWidth: viewport,
      }),
      0,
    );
  });

  it('stays at the high end without a gap', () => {
    assert.equal(
      rescaledScrollOffset({
        from: narrow,
        scrollLeft: narrow.stripWidth - viewport,
        to: wide,
        viewportWidth: viewport,
      }),
      wide.stripWidth - viewport,
    );
  });

  it('keeps the offset valid when the keys narrow at the high end', () => {
    const offset = rescaledScrollOffset({
      from: wide,
      scrollLeft: wide.stripWidth - viewport,
      to: narrow,
      viewportWidth: viewport,
    });

    assert.equal(offset, narrow.stripWidth - viewport);
  });

  it('does not scroll when the strip fits the view', () => {
    assert.equal(
      rescaledScrollOffset({
        from: narrow,
        scrollLeft: 100,
        to: narrow,
        viewportWidth: narrow.stripWidth + 50,
      }),
      0,
    );
  });
});
