/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  cancelSelection,
  createSelectionState,
  deselectMany,
  enterSelection,
  getSelectedItems,
  isSelected,
  pruneSelection,
  selectMany,
  toggleSelection,
  type SelectionEntry,
} from './selection-model.js';

type Row = { label: string };

const entry = (key: string, label = key): SelectionEntry<Row> => ({
  item: { label },
  key,
});

const activeState = () => enterSelection(createSelectionState<Row>());

describe('selection model', () => {
  it('starts the pressed row selected when long-press enters selection', () => {
    const state = enterSelection(createSelectionState<Row>(), entry('a'));

    assert.equal(state.isActive, true);
    assert.deepEqual([...state.items.keys()], ['a']);
  });

  it('ignores toggles until selection is active', () => {
    const state = toggleSelection(createSelectionState<Row>(), entry('a'));

    assert.equal(state.items.size, 0);
    assert.equal(state.isActive, false);
  });

  it('toggles on and off and keeps selection order', () => {
    let state = activeState();

    state = toggleSelection(state, entry('b'));
    state = toggleSelection(state, entry('a'));
    state = toggleSelection(state, entry('c'));
    state = toggleSelection(state, entry('a'));

    assert.deepEqual([...state.items.keys()], ['b', 'c']);
    assert.equal(isSelected(state, 'a'), false);
  });

  it('keeps the original position and item when a key is selected again', () => {
    const first = selectMany(activeState(), [entry('a', 'first'), entry('b')]);
    const again = selectMany(first, [entry('a', 'second')]);

    assert.equal(again, first);
    assert.deepEqual(
      getSelectedItems(again).map(({ label }) => label),
      ['first', 'b'],
    );
  });

  it('keeps the selection by identity when the source list is re-sorted', () => {
    const state = selectMany(activeState(), [entry('b'), entry('a')]);
    // A re-sorted list renders the same keys in a new order.
    const resortedKeys = ['a', 'b', 'c'];

    assert.deepEqual(
      resortedKeys.filter((key) => isSelected(state, key)),
      ['a', 'b'],
    );
    assert.deepEqual([...state.items.keys()], ['b', 'a']);
  });

  it('prunes vanished items but stays in selection mode', () => {
    const state = selectMany(activeState(), [
      entry('a'),
      entry('b'),
      entry('c'),
    ]);
    const pruned = pruneSelection(state, new Set(['a', 'c', 'd']));

    assert.deepEqual([...pruned.items.keys()], ['a', 'c']);
    assert.equal(pruned.isActive, true);
    assert.equal(pruneSelection(pruned, new Set(['a', 'c'])), pruned);
  });

  it('deselects many and returns the same state when nothing matches', () => {
    const state = selectMany(activeState(), [entry('a'), entry('b')]);

    assert.deepEqual([...deselectMany(state, ['a', 'x']).items.keys()], ['b']);
    assert.equal(deselectMany(state, ['x']), state);
  });

  it('cancels back to an inactive empty selection', () => {
    const cancelled = cancelSelection(
      enterSelection(createSelectionState<Row>(), entry('a')),
    );

    assert.equal(cancelled.isActive, false);
    assert.equal(cancelled.items.size, 0);
    assert.equal(cancelSelection(cancelled), cancelled);
  });

  it('does not mutate earlier states', () => {
    const state = enterSelection(createSelectionState<Row>(), entry('a'));

    selectMany(state, [entry('b')]);
    deselectMany(state, ['a']);

    assert.deepEqual([...state.items.keys()], ['a']);
  });
});
