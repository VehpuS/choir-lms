import type {
  DriveBrowseLocation,
  DriveBrowseSnapshot,
  DriveDiscoveryResult,
} from '@org/google-drive';
import { useMemo } from 'react';

import {
  createDriveBrowseContextKey,
  createDriveBrowseResults,
} from '../utils/drive-basket-model';
import { useDriveBasketSelection } from './use-drive-basket-selection';

type UseDriveLibrarySelectionOptions = {
  activeSearchQuery: string | null;
  browseSnapshot: DriveBrowseSnapshot;
  currentLocation: DriveBrowseLocation;
  isAwaitingLocation: boolean;
  isLoading: boolean;
  issue: string | null;
  navigationStack: DriveBrowseLocation[];
  searchQuery: string;
  searchResults: DriveDiscoveryResult[];
};

// The Add import basket (browse and search share one): what the current Drive
// location lists, handed to the basket selection together with the search
// state it also covers.
export const useDriveLibrarySelection = ({
  activeSearchQuery,
  browseSnapshot,
  currentLocation,
  isAwaitingLocation,
  isLoading,
  issue,
  navigationStack,
  searchQuery,
  searchResults,
}: UseDriveLibrarySelectionOptions) => {
  const browseSelectionSource = useMemo(
    () =>
      isAwaitingLocation
        ? null
        : {
            contextKey: createDriveBrowseContextKey(currentLocation),
            isComplete: issue === null,
            isLoading,
            results: createDriveBrowseResults(browseSnapshot, navigationStack),
          },
    [
      browseSnapshot,
      currentLocation,
      isAwaitingLocation,
      isLoading,
      issue,
      navigationStack,
    ],
  );

  return useDriveBasketSelection({
    activeQuery: activeSearchQuery,
    browse: browseSelectionSource,
    inputQuery: searchQuery,
    isComplete: issue === null,
    isLoading,
    location: currentLocation,
    results: searchResults,
  });
};
