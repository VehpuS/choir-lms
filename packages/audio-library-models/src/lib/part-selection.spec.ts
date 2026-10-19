import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolvePartSelection, scorePartKey } from './part-selection.ts';
import { extractScoreParts, type ScorePart } from './score-parts.ts';
import type { SheetMusicPartSelection } from './source-sheet-music.ts';
import {
  PIANO_VOCAL_SCORE,
  SATB_SCORE,
  UNNAMED_PARTS_SCORE,
  buildMusicXml,
} from './score-parts-fixtures.ts';

const partAt = (parts: readonly ScorePart[], index: number): ScorePart => {
  const part = parts[index];

  assert.ok(part, `fixture has no part ${index}`);

  return part;
};

const satb = extractScoreParts(SATB_SCORE);
const pianoVocal = extractScoreParts(PIANO_VOCAL_SCORE);
const unnamed = extractScoreParts(UNNAMED_PARTS_SCORE);
const noVoices = extractScoreParts(
  buildMusicXml([
    { id: 'P1', name: 'Piano' },
    { id: 'P2', name: 'Violin' },
  ]),
);

describe('scorePartKey', () => {
  it('combines position and name', () => {
    assert.equal(scorePartKey({ index: 2, name: 'Tenor' }), '2:Tenor');
  });
});

describe('resolvePartSelection', () => {
  it('defaults to the vocal parts, hiding instrumental ones', () => {
    for (const selection of [undefined, 'vocal'] as const) {
      const resolved = resolvePartSelection(pianoVocal, selection);

      assert.deepEqual(resolved, {
        effective: 'vocal',
        notices: [],
        visible: [pianoVocal[0]],
      });
    }
  });

  it('keeps a part that is not known to be instrumental', () => {
    // Part 2 is a choir program; parts 1 and 3 are unknown, so nothing hides.
    assert.deepEqual(
      resolvePartSelection(unnamed, 'vocal').visible.map(({ name }) => name),
      ['Part 1', 'Part 2', 'Pt.'],
    );
  });

  it('shows every part for all', () => {
    assert.deepEqual(resolvePartSelection(pianoVocal, 'all'), {
      effective: 'all',
      notices: [],
      visible: pianoVocal,
    });
  });

  it('shows all parts with a notice when no vocal part is recognized', () => {
    assert.deepEqual(resolvePartSelection(noVoices, 'vocal'), {
      effective: 'all',
      notices: ['no-vocal-parts'],
      visible: noVoices,
    });
  });

  it('shows the parts in a saved include list, in score order', () => {
    const include = [partAt(satb, 2), partAt(satb, 0)].map(scorePartKey);

    assert.deepEqual(resolvePartSelection(satb, { include }), {
      effective: 'custom',
      notices: [],
      visible: [satb[0], satb[2]],
    });
  });

  it('lets a saved include list show an instrumental part', () => {
    const include = [scorePartKey(partAt(pianoVocal, 1))];

    assert.deepEqual(
      resolvePartSelection(pianoVocal, { include }).visible.map(
        ({ name }) => name,
      ),
      ['Piano'],
    );
  });

  it('falls back to vocal when a saved part is missing', () => {
    const resolved = resolvePartSelection(pianoVocal, {
      include: ['0:Voice', '5:Descant'],
    });

    assert.equal(resolved.effective, 'vocal');
    assert.deepEqual(resolved.notices, ['saved-parts-missing']);
    assert.deepEqual(resolved.visible, [pianoVocal[0]]);
  });

  it('falls back when a part moved or was renamed', () => {
    assert.equal(
      resolvePartSelection(satb, { include: ['0:Alto'] }).notices[0],
      'saved-parts-missing',
    );
    assert.equal(
      resolvePartSelection(satb, { include: ['2:Soprano'] }).notices[0],
      'saved-parts-missing',
    );
  });

  it('reports both notices when the fallback finds no vocal part either', () => {
    assert.deepEqual(
      resolvePartSelection(noVoices, { include: ['0:Soprano'] }),
      {
        effective: 'all',
        notices: ['saved-parts-missing', 'no-vocal-parts'],
        visible: noVoices,
      },
    );
  });

  it('shows nothing to filter for a score without parts', () => {
    const selections: Array<SheetMusicPartSelection | undefined> = [
      undefined,
      'vocal',
      'all',
      { include: ['0:A'] },
    ];

    for (const selection of selections) {
      assert.deepEqual(resolvePartSelection([], selection).visible, []);
    }
  });
});

describe('resolvePartSelection with preferred parts', () => {
  it("shows only the singer's line when the file has it", () => {
    const resolved = resolvePartSelection(satb, { preferParts: ['Alto'] });

    assert.equal(resolved.effective, 'custom');
    assert.deepEqual(
      resolved.visible.map((part) => part.name),
      ['Alto'],
    );
    assert.deepEqual(resolved.notices, []);
  });

  it('tries the learned part when no listed name matches', () => {
    const resolved = resolvePartSelection(satb, {
      learnedPart: 'Tenor',
      preferParts: ['Lead'],
    });

    assert.deepEqual(
      resolved.visible.map((part) => part.name),
      ['Tenor'],
    );
  });

  it('prefers a listed name over the learned part', () => {
    const resolved = resolvePartSelection(satb, {
      learnedPart: 'Tenor',
      preferParts: ['Bass'],
    });

    assert.deepEqual(
      resolved.visible.map((part) => part.name),
      ['Bass'],
    );
  });

  it('falls back to the vocal parts, with no notice, when nothing matches', () => {
    const resolved = resolvePartSelection(pianoVocal, {
      preferParts: ['Tenor'],
    });

    assert.equal(resolved.effective, 'vocal');
    assert.deepEqual(
      resolved.visible.map((part) => part.name),
      ['Voice'],
    );
    assert.deepEqual(resolved.notices, []);
  });

  it('falls back without a notice when no part is recognized as vocal', () => {
    const resolved = resolvePartSelection(noVoices, { preferParts: ['Bass'] });

    assert.equal(resolved.effective, 'all');
    assert.deepEqual(resolved.notices, []);
  });

  it("leaves a source's own saved selection alone", () => {
    const resolved = resolvePartSelection(satb, {
      include: [scorePartKey(partAt(satb, 3))],
    });

    assert.deepEqual(
      resolved.visible.map((part) => part.name),
      ['Bass'],
    );
  });
});
