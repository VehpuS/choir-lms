// Surface-agnostic multiple-selection state (design Decision 9). Items are
// stored next to their keys because Add's basket must keep showing and
// importing items whose folder is no longer on screen. Selection is always
// addressed by identity, never by list position, so re-sorting or refreshing a
// list cannot move it.

export type SelectionEntry<TItem> = { item: TItem; key: string };

export type SelectionState<TItem> = {
  isActive: boolean;
  // Map iteration order is insertion order, which is the order users selected.
  items: ReadonlyMap<string, TItem>;
};

export const createSelectionState = <TItem>(): SelectionState<TItem> => ({
  isActive: false,
  items: new Map(),
});

// Long-press enters selection with the pressed row already selected.
export const enterSelection = <TItem>(
  state: SelectionState<TItem>,
  initialEntry?: SelectionEntry<TItem>,
): SelectionState<TItem> => {
  const entered = state.isActive ? state : { ...state, isActive: true };

  return initialEntry === undefined
    ? entered
    : selectMany(entered, [initialEntry]);
};

export const cancelSelection = <TItem>(
  state: SelectionState<TItem>,
): SelectionState<TItem> =>
  state.isActive || state.items.size > 0
    ? createSelectionState<TItem>()
    : state;

export const toggleSelection = <TItem>(
  state: SelectionState<TItem>,
  entry: SelectionEntry<TItem>,
): SelectionState<TItem> => {
  if (!state.isActive) {
    return state;
  }

  return state.items.has(entry.key)
    ? deselectMany(state, [entry.key])
    : selectMany(state, [entry]);
};

// Already-selected keys keep their position and their stored item.
export const selectMany = <TItem>(
  state: SelectionState<TItem>,
  entries: readonly SelectionEntry<TItem>[],
): SelectionState<TItem> => {
  const additions = entries.filter(({ key }) => !state.items.has(key));

  if (additions.length === 0 && state.isActive) {
    return state;
  }

  const items = new Map(state.items);

  additions.forEach(({ item, key }) => {
    items.set(key, item);
  });

  return { isActive: true, items };
};

export const deselectMany = <TItem>(
  state: SelectionState<TItem>,
  keys: readonly string[],
): SelectionState<TItem> => {
  if (!keys.some((key) => state.items.has(key))) {
    return state;
  }

  const removed = new Set(keys);

  return {
    ...state,
    items: new Map([...state.items].filter(([key]) => !removed.has(key))),
  };
};

// Drops items that no longer exist (deleted, filtered out of the data set).
// Selection mode stays active so the user is not thrown out of it.
export const pruneSelection = <TItem>(
  state: SelectionState<TItem>,
  validKeys: ReadonlySet<string>,
): SelectionState<TItem> => {
  const staleKeys = [...state.items.keys()].filter(
    (key) => !validKeys.has(key),
  );

  return deselectMany(state, staleKeys);
};

export const isSelected = <TItem>(
  state: SelectionState<TItem>,
  key: string,
): boolean => state.items.has(key);

export const getSelectedItems = <TItem>(
  state: SelectionState<TItem>,
): TItem[] => [...state.items.values()];
