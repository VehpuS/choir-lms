import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createKeyboardLayout } from './keyboard-layout.js';
import { getDetectedKeys, NO_DETECTED_KEYS } from './piano-detected-model.js';

const layout = createKeyboardLayout(40);
const VIEWPORT = 400;
const A3 = 57;
const C4 = 60;
const C_SHARP_4 = 61;
const A4 = 69;
const keyCentre = (midi: number) => {
  const key = layout.keys.find((candidate) => candidate.midi === midi);

  return (key?.left ?? 0) + (key?.width ?? 0) / 2;
};
/** A scroll offset that puts `midi` in the middle of the view. */
const centredOn = (midi: number) => keyCentre(midi) - VIEWPORT / 2;
const detect = (
  sungMidi: number | null,
  scrollLeft: number,
  width = VIEWPORT,
) => getDetectedKeys({ sungMidi, layout, scrollLeft, viewportWidth: width });

describe('detected keys', () => {
  it('lights a white key that is in view', () => {
    assert.deepEqual(detect(A3, centredOn(A3)), { midi: A3, edge: null });
  });

  it('lights a black key that is in view', () => {
    assert.deepEqual(detect(C_SHARP_4, centredOn(C_SHARP_4)), {
      midi: C_SHARP_4,
      edge: null,
    });
  });

  it('shows nothing when nothing is sung', () => {
    assert.deepEqual(detect(null, 0), NO_DETECTED_KEYS);
  });

  it('shows nothing before the keyboard is measured', () => {
    assert.deepEqual(detect(A3, 0, 0), NO_DETECTED_KEYS);
  });

  it('shows nothing for a note off the 88 keys', () => {
    assert.deepEqual(detect(10, 0), NO_DETECTED_KEYS);
    assert.deepEqual(detect(120, 0), NO_DETECTED_KEYS);
  });

  it('points left, with the note name, when the key is scrolled past the left edge', () => {
    const result = detect(A3, centredOn(A4));

    assert.equal(result.midi, null);
    assert.deepEqual(result.edge, {
      side: 'left',
      label: 'A3',
      spokenLabel: 'Sung note A3 is off screen to the left',
    });
  });

  it('points right when the key is past the right edge', () => {
    const result = detect(A4, centredOn(A3));

    assert.equal(result.midi, null);
    assert.equal(result.edge?.side, 'right');
    assert.equal(result.edge?.label, 'A4');
  });

  it('lights a key whose centre is in view and points for one whose centre is not', () => {
    const edgeScroll = keyCentre(C4) - 1;

    assert.equal(detect(C4, edgeScroll).midi, C4);
    assert.equal(detect(C4, keyCentre(C4) + 1).edge?.side, 'left');
  });

  it('follows the scroll: the same note moves from pointing to lit as it comes into view', () => {
    assert.equal(detect(A4, centredOn(A3)).edge?.side, 'right');
    assert.equal(detect(A4, centredOn(A4)).midi, A4);
  });

  it('follows the key width: a wider keyboard pushes the same key out of view', () => {
    const wide = createKeyboardLayout(100);
    const scrollLeft = centredOn(A4);
    const result = getDetectedKeys({
      sungMidi: A4,
      layout: wide,
      scrollLeft,
      viewportWidth: VIEWPORT,
    });

    assert.equal(result.midi, null);
    assert.ok(result.edge);
  });

  it('reports the real octave, never folding the note into view', () => {
    assert.equal(detect(A3, centredOn(A4)).edge?.label, 'A3');
  });
});
