import { useCallback, useMemo, useState } from 'react';

import {
  cancelSelection,
  createSelectionState,
  deselectMany,
  enterSelection,
  getSelectedItems,
  pruneSelection,
  selectMany,
  toggleSelection,
  type SelectionEntry,
  type SelectionState,
} from './selection-model';

// Stable-callback wrapper over the pure model. Surface hooks compose it and
// supply their own identity functions and pruning.
export const useSelection = <TItem>() => {
  const [state, setState] = useState<SelectionState<TItem>>(
    createSelectionState<TItem>,
  );

  const selectedKeys = useMemo(
    () => new Set(state.items.keys()),
    [state.items],
  );
  const selectedItems = useMemo(() => getSelectedItems(state), [state]);

  return {
    cancel: useCallback(() => {
      setState(cancelSelection);
    }, []),
    deselectMany: useCallback((keys: readonly string[]) => {
      setState((current) => deselectMany(current, keys));
    }, []),
    enter: useCallback((initialEntry?: SelectionEntry<TItem>) => {
      setState((current) => enterSelection(current, initialEntry));
    }, []),
    isActive: state.isActive,
    prune: useCallback((validKeys: ReadonlySet<string>) => {
      setState((current) => pruneSelection(current, validKeys));
    }, []),
    selectedCount: state.items.size,
    selectedItems,
    selectedKeys,
    selectMany: useCallback((entries: readonly SelectionEntry<TItem>[]) => {
      setState((current) => selectMany(current, entries));
    }, []),
    toggle: useCallback((entry: SelectionEntry<TItem>) => {
      setState((current) => toggleSelection(current, entry));
    }, []),
  };
};
