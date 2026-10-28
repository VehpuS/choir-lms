import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildMarkRules,
  getOffsetLabel,
  getScoreMarks,
  NO_SCORE_MARKS,
} from './score-pitch-marks.js';

const A3 = 57;
const A4 = 69;
const A5 = 81;
const G4 = 67;
const B4 = 71;
const PAINT = {
  exact: { fill: 'strong', stroke: 'edge', strokeWidth: 1.2 },
  soft: { fill: 'soft' },
};

describe('score marks: which notes match', () => {
  it('marks the sung note strongly, with no soft marks by default', () => {
    assert.deepEqual(
      getScoreMarks({ sungMidi: A4, pitchOffset: 0, showOtherOctave: false }),
      { exactMidi: A4, otherOctaveMidis: [] },
    );
  });

  it('marks nothing when nothing is sung', () => {
    assert.deepEqual(
      getScoreMarks({ sungMidi: null, pitchOffset: 0, showOtherOctave: true }),
      NO_SCORE_MARKS,
    );
  });

  it('adds the same note in every other octave, never the note itself, when the setting is on', () => {
    const { exactMidi, otherOctaveMidis } = getScoreMarks({
      sungMidi: A4,
      pitchOffset: 0,
      showOtherOctave: true,
    });

    assert.equal(exactMidi, A4);
    assert.ok(otherOctaveMidis.includes(A3));
    assert.ok(otherOctaveMidis.includes(A5));
    assert.ok(!otherOctaveMidis.includes(A4));
    assert.ok(otherOctaveMidis.every((midi) => (midi - A4) % 12 === 0));
  });

  it('follows a track shifted down: singing G4 marks the written A4', () => {
    assert.equal(
      getScoreMarks({ sungMidi: G4, pitchOffset: -2, showOtherOctave: false })
        .exactMidi,
      A4,
    );
  });

  it('follows a track shifted up: singing B4 marks the written A4', () => {
    assert.equal(
      getScoreMarks({ sungMidi: B4, pitchOffset: 2, showOtherOctave: false })
        .exactMidi,
      A4,
    );
  });

  it('is unaffected by speed alone, which leaves the offset at zero', () => {
    const slowed = getScoreMarks({
      sungMidi: A4,
      pitchOffset: 0,
      showOtherOctave: false,
    });

    assert.equal(slowed.exactMidi, A4);
  });

  it('shifts the soft marks with the offset too', () => {
    const { otherOctaveMidis } = getScoreMarks({
      sungMidi: G4,
      pitchOffset: -2,
      showOtherOctave: true,
    });

    assert.ok(otherOctaveMidis.includes(A3) && otherOctaveMidis.includes(A5));
  });

  it('marks nothing when the offset would put the note off the scale', () => {
    assert.deepEqual(
      getScoreMarks({ sungMidi: 5, pitchOffset: 12, showOtherOctave: true }),
      NO_SCORE_MARKS,
    );
  });
});

describe('score marks: style text', () => {
  it('is empty when nothing is marked, which clears every mark', () => {
    assert.equal(buildMarkRules(NO_SCORE_MARKS, PAINT), '');
  });

  it('keys one strong rule on the note tag', () => {
    const text = buildMarkRules({ exactMidi: A4, otherOctaveMidis: [] }, PAINT);

    assert.equal(
      text,
      '[data-midi="69"] path{fill:strong;stroke:edge;stroke-width:1.2}',
    );
  });

  it('puts the soft rule before the strong one, with its own paint', () => {
    const text = buildMarkRules(
      { exactMidi: A4, otherOctaveMidis: [A3, A5] },
      PAINT,
    );
    const [soft, strong] = text.split('\n');

    assert.equal(
      soft,
      '[data-midi="57"] path,[data-midi="81"] path{fill:soft}',
    );
    assert.ok(strong.startsWith('[data-midi="69"] path{fill:strong'));
    assert.notEqual(soft.split('{')[1], strong.split('{')[1]);
  });
});

describe('offset label', () => {
  it('names a downward shift with a true minus sign', () => {
    assert.equal(getOffsetLabel(-2), 'Following track pitch −2 st');
  });

  it('names an upward shift with a plus', () => {
    assert.equal(getOffsetLabel(3), 'Following track pitch +3 st');
  });

  it('shows nothing at zero', () => {
    assert.equal(getOffsetLabel(0), null);
  });
});
