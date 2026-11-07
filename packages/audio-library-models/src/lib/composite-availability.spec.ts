import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getCompositeState,
  getPlayableStemIds,
  getStemStates,
  relinkStem,
  removeStem,
} from './composite-availability.ts';
import type { CompositeStem } from './composite-track.ts';

const stem = (id: string, trackId = `t-${id}`): CompositeStem => ({
  id,
  trackId,
  name: id,
  offsetMs: 120,
  mine: id === 'b',
});
const stems = [stem('a'), stem('b'), stem('c')];
const track = (id: string, status: 'available' | 'unavailable' = 'available') =>
  [id, { id, availability: { status } }] as const;
const library = (
  ...entries: ReadonlyArray<readonly [string, never] | ReturnType<typeof track>>
) => new Map(entries as ReturnType<typeof track>[]);

describe('getStemStates', () => {
  it('is playable when every track is in the library', () => {
    const states = getStemStates(
      stems,
      library(track('t-a'), track('t-b'), track('t-c')),
    );

    assert.equal(getCompositeState(states), 'playable');
  });

  it('flags a deleted track as missing and plays the rest', () => {
    const states = getStemStates(stems, library(track('t-a'), track('t-c')));

    assert.deepEqual(
      states.map((s) => s.state),
      ['available', 'missing', 'available'],
    );
    assert.equal(getCompositeState(states), 'partly-playable');
    assert.deepEqual(getPlayableStemIds(states), ['a', 'c']);
  });

  it('flags a track that cannot be played as missing', () => {
    const states = getStemStates(
      stems,
      library(track('t-a'), track('t-b', 'unavailable'), track('t-c')),
    );

    assert.equal(states[1].state, 'missing');
  });

  it('keeps a loading stem counted as present', () => {
    const states = getStemStates(
      stems,
      library(track('t-a'), track('t-b'), track('t-c')),
      new Set(['b']),
    );

    assert.equal(states[1].state, 'loading');
    assert.equal(getCompositeState(states), 'playable');
    assert.deepEqual(getPlayableStemIds(states), ['a', 'b', 'c']);
  });

  it('is unavailable when every stem is missing', () => {
    const states = getStemStates(stems, library());

    assert.equal(getCompositeState(states), 'unavailable');
    assert.deepEqual(getPlayableStemIds(states), []);
  });
});

describe('getCompositeState with no stems', () => {
  it('is unavailable', () => {
    assert.equal(getCompositeState([]), 'unavailable');
  });
});

describe('relinkStem', () => {
  it('points the stem at another track and keeps its name, offset and mark', () => {
    const next = relinkStem(stems, 'b', 't-new');

    assert.deepEqual(next[1], { ...stems[1], trackId: 't-new' });
    assert.equal(next[0].trackId, 't-a');
  });

  it('turns a missing stem back to available once the new track is in the library', () => {
    const next = relinkStem(stems, 'b', 't-new');
    const states = getStemStates(
      next,
      library(track('t-a'), track('t-new'), track('t-c')),
    );

    assert.equal(getCompositeState(states), 'playable');
  });

  it('refuses a track that is already another stem', () => {
    assert.deepEqual(relinkStem(stems, 'b', 't-a'), stems);
  });
});

describe('removeStem', () => {
  it('removes a stem when two or more remain', () => {
    const result = removeStem(stems, 'b');

    assert.equal(result.outcome, 'removed');
    assert.deepEqual(
      result.outcome === 'removed' && result.stems.map((s) => s.id),
      ['a', 'c'],
    );
  });

  it('asks to delete the composite when one would be left', () => {
    assert.deepEqual(removeStem(stems.slice(0, 2), 'a'), {
      outcome: 'ask-delete',
    });
  });

  it('leaves the stems alone for an unknown stem', () => {
    assert.deepEqual(removeStem(stems, 'zzz'), { outcome: 'unchanged' });
  });
});
