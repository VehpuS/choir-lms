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
const event = (
  start: number,
  end: number,
  ...pitches: number[]
): GridEvent => ({
  end,
  pitches,
  start,
});

const write = (voices: GridEvent[][], barCount: number, barLength = 16) =>
  readParts(
    `<part id="P1">${writePartMeasuresXml({
      barCount,
      barLength,
      beatType: 4,
      beats: barLength / 4,
      clef: TREBLE,
      fifths: 0,
      voices,
    })}</part>`,
  ).P1 ?? [];

describe('splitIntoNoteValues', () => {
  it('writes a length as the fewest standard note values', () => {
    const sizes = (length: number) =>
      splitIntoNoteValues(length).map(({ size }) => size);

    assert.deepEqual(sizes(16), [16]);
    assert.deepEqual(sizes(12), [12]);
    assert.deepEqual(sizes(5), [4, 1]);
    assert.deepEqual(sizes(7), [6, 1]);
    assert.deepEqual(sizes(24), [16, 8]);
    assert.deepEqual(sizes(0), []);
  });

  it('names dotted values', () => {
    assert.deepEqual(splitIntoNoteValues(6), [
      { dotted: true, size: 6, type: 'quarter' },
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
    const measures = write([[event(4, 8, 60)]], 2);

    assert.equal(measures.length, 2);
    assert.deepEqual(
      measures[0]?.notes.map(({ isRest, duration }) => [isRest, duration]),
      [
        [true, 4],
        [false, 4],
        [true, 8],
      ],
    );
    assert.deepEqual(
      measures[1]?.notes.map(({ isRest, duration }) => [isRest, duration]),
      [[true, 16]],
    );
  });

  it('splits a note across the barline and ties the halves', () => {
    // A 12-long note starting at 10 crosses the barline at 16: 6 on each side.
    const [first, second] = write([[event(10, 22, 60)]], 2);
    const held = (bar: ReadMeasure | undefined) =>
      (bar?.notes ?? [])
        .filter(({ isRest }) => !isRest)
        .map(({ duration, tieStart, tieStop }) => [
          duration,
          tieStart,
          tieStop,
        ]);

    assert.deepEqual(held(first), [[6, true, false]]);
    assert.deepEqual(held(second), [[6, false, true]]);
  });

  it('chains ties through the pieces on both sides of the barline', () => {
    // 6 before the barline, 7 after (a dotted quarter and a 16th).
    const [first, second] = write([[event(10, 23, 60)]], 2);
    const held = (bar: ReadMeasure | undefined) =>
      (bar?.notes ?? [])
        .filter(({ isRest }) => !isRest)
        .map(({ duration, tieStart, tieStop }) => [
          duration,
          tieStart,
          tieStop,
        ]);

    assert.deepEqual(held(first), [[6, true, false]]);
    assert.deepEqual(held(second), [
      [6, true, true],
      [1, false, true],
    ]);
  });

  it('ties the pieces of a length that needs several note values', () => {
    const [bar] = write([[event(0, 5, 60)]], 1);
    const notes = bar?.notes.filter(({ isRest }) => !isRest) ?? [];

    assert.deepEqual(
      notes.map(({ duration, tieStart, tieStop }) => [
        duration,
        tieStart,
        tieStop,
      ]),
      [
        [4, true, false],
        [1, false, true],
      ],
    );
  });

  it('writes a chord as notes sharing one duration', () => {
    const [bar] = write([[event(0, 4, 64, 60, 55)]], 1);
    const chord = bar?.notes.filter(({ isRest }) => !isRest) ?? [];

    assert.deepEqual(
      chord.map(({ isChord, octave, step }) => [isChord, step, octave]),
      [
        [false, 'E', 4],
        [true, 'C', 4],
        [true, 'G', 3],
      ],
    );
  });

  it('adds a second voice only in the bars where it has notes', () => {
    const [first, second] = write(
      [[event(0, 16, 72), event(16, 32, 74)], [event(0, 8, 60)]],
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
        [event(1, 7, 60), event(9, 25, 62), event(30, 33, 64, 67)],
        [event(0, 12, 48), event(20, 28, 50)],
      ],
      3,
    );

    for (const measure of measures) {
      for (const length of Object.values(voiceLengths(measure))) {
        assert.equal(length, 16, `bar ${measure.number}`);
      }
    }
  });

  it('works in other meters', () => {
    const measures = write([[event(0, 12, 60), event(12, 30, 62)]], 3, 12);

    for (const measure of measures) {
      assert.equal(voiceLengths(measure)[1], 12);
    }
  });
});
