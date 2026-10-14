import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { GridEvent } from './midi-notation-quantize.ts';
import {
  readParts,
  requireMeasure,
  voiceLengths,
  type ReadMeasure,
} from './midi-notation-test-support.ts';
import {
  escapeXml,
  splitIntoNoteValues,
  writePartMeasuresXml,
} from './midi-notation-xml.ts';

const TREBLE = { line: 2, sign: 'G' } as const;
const BAR = 48; // a 4/4 bar in twelfths of a quarter
const event = (
  start: number,
  end: number,
  ...pitches: number[]
): GridEvent => ({
  end,
  pitches,
  start,
});

const write = (
  voices: GridEvent[][],
  barCount: number,
  options: { barLength?: number; tripletWindows?: number[] } = {},
) => {
  const barLength = options.barLength ?? BAR;

  return (
    readParts(
      `<part id="P1">${writePartMeasuresXml({
        barCount,
        barLength,
        beatType: 4,
        beats: barLength / 12,
        clef: TREBLE,
        fifths: 0,
        tripletWindows: new Set(options.tripletWindows ?? []),
        voices,
      })}</part>`,
    ).P1 ?? []
  );
};

const sounding = (measure: ReadMeasure | undefined) =>
  (measure?.notes ?? []).filter(({ isRest }) => !isRest);

describe('splitIntoNoteValues', () => {
  it('writes a length as the fewest standard note values', () => {
    const sizes = (length: number, isTuplet = false) =>
      splitIntoNoteValues(length, isTuplet).map(({ size }) => size);

    assert.deepEqual(sizes(48), [48]);
    assert.deepEqual(sizes(36), [36]);
    assert.deepEqual(sizes(15), [12, 3]);
    assert.deepEqual(sizes(21), [18, 3]);
    assert.deepEqual(sizes(72), [48, 24]);
    assert.deepEqual(sizes(0), []);
  });

  it('names dotted values', () => {
    assert.deepEqual(splitIntoNoteValues(18), [
      { dotted: true, size: 18, type: 'quarter' },
    ]);
  });

  it('writes triplet lengths as triplet note values', () => {
    const sizes = (length: number) =>
      splitIntoNoteValues(length, true).map(({ size, type }) => [size, type]);

    assert.deepEqual(sizes(4), [[4, 'eighth']]);
    assert.deepEqual(sizes(8), [[8, 'quarter']]);
    assert.deepEqual(sizes(12), [
      [8, 'quarter'],
      [4, 'eighth'],
    ]);
  });
});

describe('escapeXml', () => {
  it('escapes markup characters and drops forbidden control characters', () => {
    assert.equal(
      escapeXml(`Soprano "I" & <II> 'x'\u0001`),
      'Soprano &quot;I&quot; &amp; &lt;II&gt; &apos;x&apos;',
    );
  });
});

describe('writePartMeasuresXml', () => {
  it('fills every bar, writing rests around the notes', () => {
    const measures = write([[event(12, 24, 60)]], 2);
    const shape = (measure: ReadMeasure | undefined) =>
      measure?.notes.map(({ isRest, duration }) => [isRest, duration]);

    assert.equal(measures.length, 2);
    assert.deepEqual(shape(measures[0]), [
      [true, 12],
      [false, 12],
      [true, 24],
    ]);
    assert.deepEqual(shape(measures[1]), [[true, 48]]);
  });

  it('splits a note across the barline and ties the halves', () => {
    // 36 long from 30: 18 before the barline, 18 after.
    const [first, second] = write([[event(30, 66, 60)]], 2);
    const held = (bar: ReadMeasure | undefined) =>
      sounding(bar).map(({ duration, tieStart, tieStop }) => [
        duration,
        tieStart,
        tieStop,
      ]);

    assert.deepEqual(held(first), [[18, true, false]]);
    assert.deepEqual(held(second), [[18, false, true]]);
  });

  it('chains ties through the pieces on both sides of the barline', () => {
    // 18 before the barline, 21 after (a dotted quarter and a 16th).
    const [first, second] = write([[event(30, 69, 60)]], 2);
    const held = (bar: ReadMeasure | undefined) =>
      sounding(bar).map(({ duration, tieStart, tieStop }) => [
        duration,
        tieStart,
        tieStop,
      ]);

    assert.deepEqual(held(first), [[18, true, false]]);
    assert.deepEqual(held(second), [
      [18, true, true],
      [3, false, true],
    ]);
  });

  it('ties the pieces of a length that needs several note values', () => {
    const [bar] = write([[event(0, 15, 60)]], 1);

    assert.deepEqual(
      sounding(bar).map(({ duration, tieStart, tieStop }) => [
        duration,
        tieStart,
        tieStop,
      ]),
      [
        [12, true, false],
        [3, false, true],
      ],
    );
  });

  it('writes a chord as notes sharing one duration', () => {
    const [bar] = write([[event(0, 12, 64, 60, 55)]], 1);

    assert.deepEqual(
      sounding(bar).map(({ isChord, octave, step }) => [isChord, step, octave]),
      [
        [false, 'E', 4],
        [true, 'C', 4],
        [true, 'G', 3],
      ],
    );
  });

  it('adds a second voice only in the bars where it has notes', () => {
    const [first, second] = write(
      [[event(0, 48, 72), event(48, 96, 74)], [event(0, 24, 60)]],
      2,
    );

    assert.deepEqual(Object.keys(voiceLengths(requireMeasure(first))), [
      '1',
      '2',
    ]);
    assert.deepEqual(Object.keys(voiceLengths(requireMeasure(second))), ['1']);
  });

  it('keeps every voice exactly one bar long', () => {
    const measures = write(
      [
        [event(3, 21, 60), event(27, 75, 62), event(90, 99, 64, 67)],
        [event(0, 36, 48), event(60, 84, 50)],
      ],
      3,
    );

    for (const measure of measures) {
      for (const length of Object.values(voiceLengths(measure))) {
        assert.equal(length, BAR, `bar ${measure.number}`);
      }
    }
  });

  it('works in other meters', () => {
    const measures = write([[event(0, 36, 60), event(36, 90, 62)]], 3, {
      barLength: 36,
    });

    for (const measure of measures) {
      assert.equal(voiceLengths(measure)[1], 36);
    }
  });
});

describe('writePartMeasuresXml with triplets', () => {
  const trio = [event(0, 4, 67), event(4, 8, 69), event(8, 12, 71)];

  it('writes a beat of eighth-note triplets with one bracket', () => {
    const [bar] = write([trio], 1, { tripletWindows: [0] });
    const triplets = sounding(bar);

    assert.deepEqual(
      triplets.map(({ duration, type, isTuplet }) => [
        duration,
        type,
        isTuplet,
      ]),
      [
        [4, 'eighth', true],
        [4, 'eighth', true],
        [4, 'eighth', true],
      ],
    );
    assert.deepEqual(
      triplets.map(({ tupletStart }) => tupletStart),
      [true, false, false],
    );
    assert.deepEqual(
      triplets.map(({ tupletStop }) => tupletStop),
      [false, false, true],
    );
    // The rest of the bar is ordinary.
    assert.equal(bar?.notes[3]?.isTuplet, false);
  });

  it('writes a quarter-then-eighth triplet beat', () => {
    const [bar] = write([[event(0, 8, 60), event(8, 12, 62)]], 1, {
      tripletWindows: [0],
    });

    assert.deepEqual(
      sounding(bar).map(({ duration, type }) => [duration, type]),
      [
        [8, 'quarter'],
        [4, 'eighth'],
      ],
    );
  });

  it('brackets each triplet beat separately', () => {
    const second = [event(12, 16, 72), event(16, 20, 74), event(20, 24, 76)];
    const [bar] = write([[...trio, ...second]], 1, { tripletWindows: [0, 1] });
    const notes = sounding(bar);

    assert.deepEqual(
      notes.map(({ tupletStart }) => tupletStart),
      [true, false, false, true, false, false],
    );
    assert.deepEqual(
      notes.map(({ tupletStop }) => tupletStop),
      [false, false, true, false, false, true],
    );
  });

  it('writes a note that fills a whole triplet beat as an ordinary quarter', () => {
    const [bar] = write([[event(0, 12, 60)]], 1, { tripletWindows: [0] });

    assert.deepEqual(
      sounding(bar).map(({ duration, isTuplet }) => [duration, isTuplet]),
      [[12, false]],
    );
  });

  it('does not split a note that passes over a triplet beat', () => {
    const [bar] = write([[event(0, 24, 60)]], 1, { tripletWindows: [1] });

    assert.deepEqual(
      sounding(bar).map(({ duration, isTuplet }) => [duration, isTuplet]),
      [[24, false]],
    );
  });

  it('splits and ties a note that runs from a straight beat into a triplet beat', () => {
    const [bar] = write([[event(6, 16, 60)]], 1, { tripletWindows: [1] });

    assert.deepEqual(
      bar?.notes.map(({ duration, isRest, isTuplet, tieStart, tieStop }) => [
        duration,
        isRest,
        isTuplet,
        tieStart,
        tieStop,
      ]),
      [
        [6, true, false, false, false],
        [6, false, false, true, false],
        [4, false, true, false, true],
        [8, true, true, false, false],
        [24, true, false, false, false],
      ],
    );
    // The bracket runs from the note through the triplet rest.
    assert.deepEqual(
      bar?.notes.map(({ tupletStart, tupletStop }) => [
        tupletStart,
        tupletStop,
      ]),
      [
        [false, false],
        [false, false],
        [true, false],
        [false, true],
        [false, false],
      ],
    );
  });

  it('keeps every voice exactly one bar long when triplets and straight beats mix', () => {
    const measures = write(
      [
        [
          ...trio,
          event(12, 24, 72),
          event(24, 32, 60),
          event(32, 36, 62),
          event(42, 45, 64),
        ],
        [event(0, 36, 48), event(36, 60, 50)],
      ],
      2,
      { tripletWindows: [0, 2] },
    );

    for (const measure of measures) {
      for (const length of Object.values(voiceLengths(measure))) {
        assert.equal(length, BAR, `bar ${measure.number}`);
      }
    }
  });
});
