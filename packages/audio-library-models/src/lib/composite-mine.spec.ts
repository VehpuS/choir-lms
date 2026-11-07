import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  findMineStem,
  markMineStem,
  setStemMine,
  suggestMineStemId,
} from './composite-mine.ts';
import type { CompositeStem } from './composite-track.ts';

const stem = (name: string, mine = false): CompositeStem => ({
  id: name,
  trackId: `track-${name}`,
  name,
  offsetMs: 0,
  mine,
});

const choir = () => [
  stem('Soprano'),
  stem('Alto'),
  stem('Tenor'),
  stem('Bass'),
];

describe('suggestMineStemId', () => {
  it('points at the stem named like the preferred part', () => {
    assert.equal(suggestMineStemId(choir(), ['Bass']), 'Bass');
  });

  it('matches by alias and number', () => {
    assert.equal(
      suggestMineStemId([stem('S'), stem('Tenor 2')], ['Tenor']),
      'Tenor 2',
    );
  });

  it('returns nothing without preferences or a match', () => {
    assert.equal(suggestMineStemId(choir(), []), undefined);
    assert.equal(suggestMineStemId(choir(), ['Baritone']), undefined);
    assert.equal(
      suggestMineStemId([stem('piano guide'), stem('click')], ['Bass']),
      undefined,
    );
  });

  it('lets the first preference that matches decide with several preferences', () => {
    assert.equal(
      suggestMineStemId(choir(), ['Baritone', 'Tenor', 'Bass']),
      'Tenor',
    );
  });

  it('picks an exact name over a soft match and marks only one stem', () => {
    const stems = [stem('Alto 1'), stem('Alto 2'), stem('Alto')];

    assert.equal(suggestMineStemId(stems, ['Alto']), 'Alto');
    assert.equal(
      suggestMineStemId([stem('Alto 1'), stem('Alto 2')], ['Alto']),
      'Alto 1',
    );
  });
});

describe('markMineStem', () => {
  it('marks the match and clears other marks', () => {
    const marked = markMineStem(
      [stem('Soprano', true), stem('Bass')],
      ['Bass'],
    );

    assert.deepEqual(
      marked.map((s) => s.mine),
      [false, true],
    );
  });

  it('marks nothing when no preference matches', () => {
    const marked = markMineStem(choir(), ['Beatbox']);

    assert.equal(findMineStem(marked), undefined);
  });
});

describe('setStemMine', () => {
  it('moves the mark to the chosen stem', () => {
    const next = setStemMine(
      [stem('Soprano', true), stem('Alto')],
      'Alto',
      true,
    );

    assert.deepEqual(
      next.map((s) => s.mine),
      [false, true],
    );
  });

  it('switches the mark off and leaves none', () => {
    const next = setStemMine(
      [stem('Soprano', true), stem('Alto')],
      'Soprano',
      false,
    );

    assert.equal(findMineStem(next), undefined);
  });

  it('does not clear another stem when switching one off', () => {
    const next = setStemMine(
      [stem('Soprano', true), stem('Alto')],
      'Alto',
      false,
    );

    assert.equal(findMineStem(next)?.id, 'Soprano');
  });
});
