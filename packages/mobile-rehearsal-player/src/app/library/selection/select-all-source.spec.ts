/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createSelectAllState,
  deselectWithSelectAll,
  startSelectAll,
  synchronizeSelectAll,
  toggleWithSelectAll,
  type SelectAllSourceSnapshot,
} from './select-all-source.js';
import {
  createSelectionState,
  enterSelection,
  type SelectionEntry,
} from './selection-model.js';

type Row = { label: string };

const entries = (...keys: string[]): SelectionEntry<Row>[] =>
  keys.map((key) => ({ item: { label: key }, key }));

const snapshot = (
  contextKey: string | null,
  keys: string[],
  isLoading: boolean,
): SelectAllSourceSnapshot<Row> => ({
  contextKey,
  entries: entries(...keys),
  isLoading,
});

const selectedKeys = (state: {
  selection: { items: ReadonlyMap<string, Row> };
}) => [...state.selection.items.keys()];

const initialState = () =>
  createSelectAllState(enterSelection(createSelectionState<Row>()));

describe('select-all source', () => {
  it('selects the loaded page and keeps feeding later pages until complete', () => {
    let state = startSelectAll(initialState(), snapshot('q', ['a', 'b'], true));

    assert.notEqual(state.pending, null);

    state = synchronizeSelectAll(state, snapshot('q', ['a', 'b', 'c'], true));
    state = synchronizeSelectAll(
      state,
      snapshot('q', ['a', 'b', 'c', 'd'], false),
    );

    assert.deepEqual(selectedKeys(state), ['a', 'b', 'c', 'd']);
    assert.equal(state.pending, null);
  });

  it('does not leave a pending source when everything is already loaded', () => {
    const state = startSelectAll(initialState(), snapshot('q', ['a'], false));

    assert.equal(state.pending, null);
    assert.deepEqual(selectedKeys(state), ['a']);
  });

  it('does not re-add a result the user deselected while pages were arriving', () => {
    let state = startSelectAll(initialState(), snapshot('q', ['a', 'b'], true));

    state = toggleWithSelectAll(state, entries('b')[0]);
    state = synchronizeSelectAll(state, snapshot('q', ['a', 'b', 'c'], false));

    assert.deepEqual(selectedKeys(state), ['a', 'c']);
  });

  it('lets a deselected result be selected again while pending', () => {
    let state = startSelectAll(initialState(), snapshot('q', ['a', 'b'], true));

    state = toggleWithSelectAll(state, entries('b')[0]);
    state = toggleWithSelectAll(state, entries('b')[0]);
    state = synchronizeSelectAll(state, snapshot('q', ['a', 'b', 'c'], false));

    assert.deepEqual(selectedKeys(state), ['a', 'b', 'c']);
  });

  it('records basket-view deselections so they are not re-added', () => {
    let state = startSelectAll(initialState(), snapshot('q', ['a', 'b'], true));

    state = deselectWithSelectAll(state, ['a']);
    state = synchronizeSelectAll(state, snapshot('q', ['a', 'b', 'c'], true));

    assert.deepEqual(selectedKeys(state), ['b', 'c']);
  });

  it('stops on a context change, keeps what it added, and adds nothing from the new context', () => {
    let state = startSelectAll(
      initialState(),
      snapshot('q1', ['a', 'b'], true),
    );

    state = synchronizeSelectAll(state, snapshot('q2', ['x', 'y'], true));
    state = synchronizeSelectAll(state, snapshot('q2', ['x', 'y'], false));

    assert.equal(state.pending, null);
    assert.deepEqual(selectedKeys(state), ['a', 'b']);
  });

  it('keeps earlier explicit selections when select-all starts', () => {
    const base = createSelectAllState(
      enterSelection(createSelectionState<Row>(), entries('z')[0]),
    );
    const state = startSelectAll(base, snapshot('q', ['a'], false));

    assert.deepEqual(selectedKeys(state), ['z', 'a']);
  });

  it('ignores a start without a context', () => {
    const state = initialState();

    assert.equal(startSelectAll(state, snapshot(null, ['a'], false)), state);
  });
});
