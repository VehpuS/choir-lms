import type {
  DriveBrowseLocation,
  DriveDiscoveryResult,
} from '@org/google-drive';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createSelectAllState,
  deselectContext,
  deselectWithSelectAll,
  isSelectAllComplete,
  startSelectAll,
  synchronizeSelectAll,
  toggleWithSelectAll,
  type SelectAllSourceSnapshot,
  type SelectAllState,
} from '../../selection/select-all-source';
import {
  createSelectionState,
  deselectMany,
  enterSelection,
  getSelectedItems,
  type SelectionEntry,
} from '../../selection/selection-model';

/** The folder being browsed, as a selection source while no search is active. */
type DriveBrowseSelectionSource = {
  contextKey: string;
  isComplete: boolean;
  isLoading: boolean;
  results: DriveDiscoveryResult[];
};

type UseDriveSearchSelectionOptions = {
  activeQuery: string | null;
  /** Null while the folder's rows are not the ones on screen yet. */
  browse?: DriveBrowseSelectionSource | null;
  inputQuery: string;
  isComplete: boolean;
  isLoading: boolean;
  location: DriveBrowseLocation;
  results: DriveDiscoveryResult[];
};

type DriveSearchSelectionState = {
  isReviewReady: boolean;
  selectAll: SelectAllState<DriveDiscoveryResult>;
};

const createInitialState = (): DriveSearchSelectionState => ({
  isReviewReady: false,
  selectAll: createSelectAllState(createSelectionState<DriveDiscoveryResult>()),
});

const toEntry = (
  result: DriveDiscoveryResult,
): SelectionEntry<DriveDiscoveryResult> => ({ item: result, key: result.id });

// Identifies one search (scope + query) so a pending `Select all matching`
// knows when the results it is gathering stop being the visible ones.
export const createDriveSearchContextKey = (
  location: Pick<DriveBrowseLocation, 'id' | 'kind' | 'rootKind'>,
  query: string,
) =>
  [
    location.rootKind,
    location.kind,
    location.id,
    query.trim().toLocaleLowerCase(),
  ].join(':');

// The Add basket over the shared selection model. Its source is the active
// search's results, or the browsed folder's rows when no search is active.
// A context change keeps what is already selected (the basket) and only ends a
// pending select-all, which keeps the pages it had already added.
export const useDriveSearchSelection = (
  options: UseDriveSearchSelectionOptions,
) => {
  const hasCurrentQuery =
    options.activeQuery?.trim().toLocaleLowerCase() ===
    options.inputQuery.trim().toLocaleLowerCase();
  const searchContextKey = hasCurrentQuery
    ? createDriveSearchContextKey(options.location, options.inputQuery)
    : null;
  // A search that is typed but not yet run leaves the old results on screen,
  // so it has no source at all rather than falling back to the folder.
  const browse = options.activeQuery === null ? (options.browse ?? null) : null;
  const source =
    searchContextKey === null && browse !== null
      ? browse
      : {
          contextKey: searchContextKey,
          isComplete: options.isComplete,
          isLoading: options.isLoading,
          results: options.results,
        };
  const { contextKey, isComplete, isLoading, results } = source;
  const [state, setState] = useState(createInitialState);

  const snapshot = useMemo<SelectAllSourceSnapshot<DriveDiscoveryResult>>(
    () => ({ contextKey, entries: results.map(toEntry), isLoading }),
    [contextKey, isLoading, results],
  );

  useEffect(() => {
    setState((current) => {
      const selectAll = synchronizeSelectAll(current.selectAll, snapshot);

      return selectAll === current.selectAll
        ? current
        : { ...current, selectAll };
    });
  }, [snapshot]);

  const { pending, selection } = state.selectAll;
  const selectedResults = useMemo(
    () => getSelectedItems(selection),
    [selection],
  );
  const selectedResultIds = useMemo(
    () => new Set(selection.items.keys()),
    [selection],
  );
  const canSelect = contextKey !== null;
  // `Select all` becomes `Deselect all` once every loaded result is selected.
  const isAllSelected =
    canSelect && isSelectAllComplete(state.selectAll, snapshot);

  const enter = useCallback(() => {
    if (!canSelect) {
      return;
    }

    setState((current) => ({
      isReviewReady: false,
      selectAll: {
        ...current.selectAll,
        selection: enterSelection(current.selectAll.selection),
      },
    }));
  }, [canSelect]);

  return {
    cancel: useCallback(() => {
      setState(createInitialState());
    }, []),
    canSelect,
    canSelectAll: canSelect && results.length > 0 && (isLoading || isComplete),
    // Empties the basket but stays in selection mode.
    clear: useCallback(() => {
      // Also ends a pending select-all, or its next page would refill it.
      setState((current) => ({
        ...current,
        selectAll: {
          pending: null,
          selection: deselectMany(current.selectAll.selection, [
            ...current.selectAll.selection.items.keys(),
          ]),
        },
      }));
    }, []),
    continueToReview: useCallback(() => {
      setState((current) => ({
        ...current,
        isReviewReady:
          current.selectAll.selection.isActive &&
          current.selectAll.pending === null &&
          current.selectAll.selection.items.size > 0,
      }));
    }, []),
    // Back from the import review: always possible, even if the search the
    // basket was built from is no longer the visible one.
    edit: useCallback(() => {
      setState((current) => ({
        isReviewReady: false,
        selectAll: {
          ...current.selectAll,
          selection: enterSelection(current.selectAll.selection),
        },
      }));
    }, []),
    enter,
    isActive: selection.isActive,
    isAllSelected,
    isReviewReady: state.isReviewReady,
    isSelectingAll: pending !== null,
    // The one select-all control: selects the whole result set, or removes it
    // (and any still-gathering pages) while keeping the rest of the basket.
    toggleAll: useCallback(() => {
      if (isAllSelected) {
        setState((current) => ({
          ...current,
          selectAll: deselectContext(
            current.selectAll,
            snapshot.entries.map(({ key }) => key),
          ),
        }));

        return;
      }

      if (!canSelect || (!isLoading && !isComplete)) {
        return;
      }

      setState((current) => ({
        isReviewReady: false,
        selectAll: startSelectAll(current.selectAll, snapshot),
      }));
    }, [canSelect, isAllSelected, isComplete, isLoading, snapshot]),
    // Takes one item out of the basket, also from the import review. Emptying
    // the basket there returns to browsing, since there is nothing to review.
    remove: useCallback((resultId: string) => {
      setState((current) => {
        const selectAll = deselectWithSelectAll(current.selectAll, [resultId]);

        return {
          isReviewReady:
            current.isReviewReady && selectAll.selection.items.size > 0,
          selectAll,
        };
      });
    }, []),
    selectedCount: selection.items.size,
    selectedResultIds,
    selectedResults,
    toggle: useCallback((result: DriveDiscoveryResult) => {
      setState((current) =>
        current.isReviewReady
          ? current
          : {
              ...current,
              selectAll: toggleWithSelectAll(
                current.selectAll,
                toEntry(result),
              ),
            },
      );
    }, []),
  };
};
