import type {
  DriveBrowseLocation,
  DriveDiscoveryResult,
} from '@org/google-drive';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  cancelDriveSearchSelection,
  continueDriveSearchSelection,
  createDriveSearchSelectionContextKey,
  createDriveSearchSelectionState,
  enterDriveSearchSelection,
  selectAllDriveSearchResults,
  synchronizeDriveSearchSelection,
  toggleDriveSearchSelectionResult,
  type DriveSearchSelectionContext,
} from '../utils/drive-search-selection-model';

type UseDriveSearchSelectionOptions = {
  activeQuery: string | null;
  inputQuery: string;
  isComplete: boolean;
  isLoading: boolean;
  location: DriveBrowseLocation;
  results: DriveDiscoveryResult[];
};

export const useDriveSearchSelection = (
  options: UseDriveSearchSelectionOptions,
) => {
  const hasCurrentQuery =
    options.activeQuery?.trim().toLocaleLowerCase() ===
    options.inputQuery.trim().toLocaleLowerCase();
  const context: DriveSearchSelectionContext | null = hasCurrentQuery
    ? { location: options.location, query: options.inputQuery }
    : null;
  const contextKey = createDriveSearchSelectionContextKey(context);
  const [state, setState] = useState(() =>
    createDriveSearchSelectionState(context),
  );

  useEffect(() => {
    setState((currentState) =>
      synchronizeDriveSearchSelection(currentState, {
        context,
        isComplete: options.isComplete,
        isLoading: options.isLoading,
        results: options.results,
      }),
    );
  }, [contextKey, options.isComplete, options.isLoading, options.results]);

  const selectedResultIds = useMemo(
    () => new Set(state.selectedResults.map(({ id }) => id)),
    [state.selectedResults],
  );

  return {
    cancel: useCallback(() => {
      setState(cancelDriveSearchSelection);
    }, []),
    continueToReview: useCallback(() => {
      setState(continueDriveSearchSelection);
    }, []),
    edit: useCallback(() => {
      setState(enterDriveSearchSelection);
    }, []),
    enter: useCallback(() => {
      setState(enterDriveSearchSelection);
    }, []),
    isActive: state.isActive,
    canSelect: context !== null,
    canSelectAll: context !== null && (options.isLoading || options.isComplete),
    isReviewReady: state.isReviewReady,
    isSelectingAll: state.isSelectingAll,
    selectAll: useCallback(() => {
      if (!options.isLoading && !options.isComplete) {
        return;
      }

      setState((currentState) =>
        selectAllDriveSearchResults(currentState, {
          isLoading: options.isLoading,
          results: options.results,
        }),
      );
    }, [options.isComplete, options.isLoading, options.results]),
    selectedCount: state.selectedResults.length,
    selectedResultIds,
    selectedResults: state.selectedResults,
    toggle: useCallback((result: DriveDiscoveryResult) => {
      setState((currentState) =>
        toggleDriveSearchSelectionResult(currentState, result),
      );
    }, []),
  };
};
