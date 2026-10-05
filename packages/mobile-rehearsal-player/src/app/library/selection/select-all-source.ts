import {
  deselectMany,
  selectMany,
  toggleSelection,
  type SelectionEntry,
  type SelectionState,
} from './selection-model';

// `Select all matching` layered over the base selection (design Decision 9):
// one pending source, identified by its context (query + scope), feeds the
// pages it has loaded so far into `selectMany` until it completes. The base
// model knows nothing about it.

export type PendingSelectAll = {
  contextKey: string;
  // Keys the user deselected while pages were still arriving; they must not be
  // re-added by the next page.
  excludedKeys: ReadonlySet<string>;
};

export type SelectAllState<TItem> = {
  pending: PendingSelectAll | null;
  selection: SelectionState<TItem>;
};

export type SelectAllSourceSnapshot<TItem> = {
  contextKey: string | null;
  // Every entry loaded so far for the context, in display order.
  entries: readonly SelectionEntry<TItem>[];
  isLoading: boolean;
};

export const createSelectAllState = <TItem>(
  selection: SelectionState<TItem>,
): SelectAllState<TItem> => ({ pending: null, selection });

export const startSelectAll = <TItem>(
  state: SelectAllState<TItem>,
  snapshot: SelectAllSourceSnapshot<TItem>,
): SelectAllState<TItem> => {
  if (snapshot.contextKey === null) {
    return state;
  }

  return {
    pending: snapshot.isLoading
      ? { contextKey: snapshot.contextKey, excludedKeys: new Set() }
      : null,
    selection: selectMany(state.selection, snapshot.entries),
  };
};

// Toggling while a source is pending must record deselections, or the next
// page would silently re-select them.
export const toggleWithSelectAll = <TItem>(
  state: SelectAllState<TItem>,
  entry: SelectionEntry<TItem>,
): SelectAllState<TItem> => {
  const selection = toggleSelection(state.selection, entry);

  if (state.pending === null || selection === state.selection) {
    return { ...state, selection };
  }

  const excludedKeys = new Set(state.pending.excludedKeys);

  if (selection.items.has(entry.key)) {
    excludedKeys.delete(entry.key);
  } else {
    excludedKeys.add(entry.key);
  }

  return { pending: { ...state.pending, excludedKeys }, selection };
};

export const deselectWithSelectAll = <TItem>(
  state: SelectAllState<TItem>,
  keys: readonly string[],
): SelectAllState<TItem> => ({
  pending:
    state.pending === null
      ? null
      : {
          ...state.pending,
          excludedKeys: new Set([...state.pending.excludedKeys, ...keys]),
        },
  selection: deselectMany(state.selection, keys),
});

// Feed the latest snapshot. A context change, or a source that stopped loading,
// ends the pending select-all; everything it already added stays selected.
export const synchronizeSelectAll = <TItem>(
  state: SelectAllState<TItem>,
  snapshot: SelectAllSourceSnapshot<TItem>,
): SelectAllState<TItem> => {
  const { pending } = state;

  if (pending === null) {
    return state;
  }

  if (pending.contextKey !== snapshot.contextKey) {
    return { ...state, pending: null };
  }

  const nextEntries = snapshot.entries.filter(
    ({ key }) => !pending.excludedKeys.has(key),
  );

  return {
    pending: snapshot.isLoading ? pending : null,
    selection: selectMany(state.selection, nextEntries),
  };
};
