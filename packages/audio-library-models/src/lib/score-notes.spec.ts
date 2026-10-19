import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  combineNoteRanges,
  extractPartNoteRanges,
  extractPartTransposes,
} from './score-notes.js';

const note = (step: string, octave: number, alter?: number) =>
  `<note><pitch><step>${step}</step>${
    alter === undefined ? '' : `<alter>${alter}</alter>`
  }<octave>${octave}</octave></pitch><duration>4</duration></note>`;
const REST = '<note><rest/><duration>4</duration></note>';

const score = (...parts: string[]) =>
  `<score-partwise>${parts
    .map(
      (body, index) =>
        `<part id="P${index + 1}"><measure number="1">${body}</measure></part>`,
    )
    .join('')}</score-partwise>`;

describe('part note ranges', () => {
  it('finds the lowest and highest pitch of each part, ignoring rests', () => {
    const xml = score(
      note('A', 3) + REST + note('E', 5) + note('C', 4),
      note('C', 3) + note('G', 3),
    );

    assert.deepEqual(extractPartNoteRanges(xml), [
      { lowest: 57, highest: 76 },
      { lowest: 48, highest: 55 },
    ]);
  });

  it('reads accidentals', () => {
    assert.deepEqual(
      extractPartNoteRanges(score(note('B', 4, -1) + note('F', 4, 1))),
      [{ lowest: 66, highest: 70 }],
    );
  });

  it('returns null for a part with no pitched notes', () => {
    assert.deepEqual(extractPartNoteRanges(score(REST)), [null]);
  });

  it('applies a transposition to the notes after it', () => {
    const transposed = `<attributes><transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose></attributes>${note('C', 5)}`;

    assert.deepEqual(extractPartNoteRanges(score(transposed)), [
      { lowest: 70, highest: 70 },
    ]);
    assert.deepEqual(extractPartTransposes(score(transposed)), [
      { chromatic: -2, octaveChange: undefined },
    ]);
  });

  it('reports no transposition for a part without one', () => {
    assert.deepEqual(extractPartTransposes(score(note('C', 4))), [{}]);
  });
});

describe('combining ranges', () => {
  it('unions ranges and skips empty parts', () => {
    assert.deepEqual(
      combineNoteRanges([
        { lowest: 57, highest: 64 },
        null,
        { lowest: 60, highest: 72 },
      ]),
      { lowest: 57, highest: 72 },
    );
    assert.equal(combineNoteRanges([null, null]), null);
  });
});
