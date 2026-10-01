import {
  MY_DRIVE_ROOT_LOCATION,
  SHARED_FOLDERS_ROOT_LOCATION,
  browseDriveLocation,
  createDrivePathResolutionCache,
  searchDriveAudioFiles,
  type DriveAuthorizationState,
  type DriveBrowseLocation,
  type DriveBrowseSnapshot,
  type DriveFolder,
} from '@org/google-drive';
import { useCallback, useEffect, useRef, useState } from 'react';

import { runtimeConfig } from '../../../../config/runtime';
import { isDriveAuthorizationFailure } from '../../../auth/google-drive/utils/authorization';
import {
  createDriveBrowseCache,
  createEmptyDriveBrowseSnapshot,
  getDriveBrowseCacheKey,
  resolveVisibleDriveBrowse,
} from '../utils/drive-browse-cache';
import { createDriveDiscoveryRequest } from '../utils/drive-discovery-request';
import { buildDriveFolderNavigationStack } from '../utils/drive-navigation-stack';
import {
  EMPTY_DRIVE_SEARCH_SNAPSHOT,
  useDriveLibrarySearch,
} from './use-drive-library-search';
import { useDriveSearchSelection } from './use-drive-search-selection';

const createRootLocation = (rootKind: DriveBrowseLocation['rootKind']) => {
  return {
    ...(rootKind === 'my-drive'
      ? MY_DRIVE_ROOT_LOCATION
      : SHARED_FOLDERS_ROOT_LOCATION),
  } satisfies DriveBrowseLocation;
};

const DEFAULT_LIBRARY_ERROR = 'Drive library could not be loaded.';

export const useDriveLibrary = (
  authState: DriveAuthorizationState,
  onAuthorizationExpired?: () => void,
  onAuthorizationRequired?: () => Promise<void> | void,
) => {
  const [navigationStack, setNavigationStack] = useState<DriveBrowseLocation[]>(
    () => {
      return [createRootLocation('my-drive')];
    },
  );
  const [loadedBrowseSnapshot, setLoadedBrowseSnapshot] =
    useState<DriveBrowseSnapshot>(() => {
      return createEmptyDriveBrowseSnapshot(createRootLocation('my-drive'));
    });
  // Session-only memory of listed folders and resolved ancestor names, so going
  // back or re-entering a folder shows its rows at once and refreshes behind.
  const browseCacheRef = useRef(createDriveBrowseCache());
  const pathCacheRef = useRef(createDrivePathResolutionCache());
  const [isLoading, setIsLoading] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [searchReturnNavigationStack, setSearchReturnNavigationStack] =
    useState<DriveBrowseLocation[] | null>(null);

  const currentLocation =
    navigationStack[navigationStack.length - 1] ??
    createRootLocation('my-drive');

  const { isAwaitingLocation, snapshot: browseSnapshot } =
    resolveVisibleDriveBrowse({
      cache: browseCacheRef.current,
      currentLocation,
      loadedSnapshot: loadedBrowseSnapshot,
    });

  const clearIssue = useCallback(() => {
    setIssue(null);
  }, []);

  const {
    activeSearchQuery,
    clearSearch,
    commitSearchQuery,
    deactivateSearch,
    recentSearchTerms,
    replaceSearchSnapshot,
    restoreSearch,
    searchQuery,
    searchSnapshot,
    setSearchQuery,
    submitSearch,
    submitSearchQuery,
    suspendSearch,
  } = useDriveLibrarySearch({
    authState,
    onAuthorizationRequired,
    onClearIssue: clearIssue,
    onSearchRequested: () => {
      setRefreshCount((currentValue) => currentValue + 1);
    },
  });
  const isAwaitingBrowse =
    isAwaitingLocation &&
    activeSearchQuery === null &&
    issue === null &&
    authState.status === 'authorized';

  const searchSelection = useDriveSearchSelection({
    activeQuery: activeSearchQuery,
    inputQuery: searchQuery,
    isComplete: issue === null,
    isLoading,
    location: currentLocation,
    results: searchSnapshot.results,
  });

  useEffect(() => {
    const accessToken = authState.accessToken;

    if (authState.status !== 'authorized' || !accessToken) {
      browseCacheRef.current.clear();
      pathCacheRef.current.clear();
      setLoadedBrowseSnapshot(createEmptyDriveBrowseSnapshot(currentLocation));
      replaceSearchSnapshot(EMPTY_DRIVE_SEARCH_SNAPSHOT);
      setIssue(null);
      setIsLoading(false);
      return;
    }

    const request = createDriveDiscoveryRequest();

    setIsLoading(true);
    setIssue(null);

    const loadDiscovery = async () => {
      if (activeSearchQuery) {
        const nextSearchSnapshot = await searchDriveAudioFiles({
          accessToken,
          location: currentLocation,
          onProgress: (progressSnapshot) => {
            if (!request.shouldApplyResult()) {
              return;
            }

            replaceSearchSnapshot(progressSnapshot);
          },
          query: activeSearchQuery,
          supportedMimeTypes: runtimeConfig.supportedAudioMimeTypes,
          supportedExtensions: runtimeConfig.supportedAudioExtensions,
          signal: request.signal,
        });

        if (!request.shouldApplyResult()) {
          return;
        }

        replaceSearchSnapshot(nextSearchSnapshot);
        return;
      }

      const browseCacheKey = getDriveBrowseCacheKey(currentLocation);
      const nextBrowseSnapshot = await browseDriveLocation({
        accessToken,
        location: currentLocation,
        // Show folders as pages arrive, but never replace an already listed
        // location (a refresh) with a folders-only view.
        onFolders: (foldersSnapshot) => {
          if (
            !request.shouldApplyResult() ||
            browseCacheRef.current.has(browseCacheKey)
          ) {
            return;
          }

          setLoadedBrowseSnapshot(foldersSnapshot);
        },
        pathCache: pathCacheRef.current,
        supportedMimeTypes: runtimeConfig.supportedAudioMimeTypes,
        supportedExtensions: runtimeConfig.supportedAudioExtensions,
        signal: request.signal,
      });

      if (!request.shouldApplyResult()) {
        return;
      }

      browseCacheRef.current.set(browseCacheKey, nextBrowseSnapshot);
      setLoadedBrowseSnapshot(nextBrowseSnapshot);
    };

    void loadDiscovery()
      .catch((error: unknown) => {
        if (!request.shouldApplyResult()) {
          return;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        if (isDriveAuthorizationFailure(error)) {
          onAuthorizationExpired?.();
          setIssue(null);
          return;
        }

        setIssue(
          error instanceof Error ? error.message : DEFAULT_LIBRARY_ERROR,
        );
      })
      .finally(() => {
        if (!request.shouldApplyResult()) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      request.dispose();
    };
  }, [
    activeSearchQuery,
    authState.accessToken,
    authState.status,
    currentLocation.id,
    currentLocation.kind,
    currentLocation.rootKind,
    onAuthorizationExpired,
    replaceSearchSnapshot,
    refreshCount,
  ]);

  return {
    activeSearchQuery,
    browseSnapshot,
    canReturnToSearchResults: searchReturnNavigationStack !== null,
    clearSearch() {
      setSearchReturnNavigationStack(null);
      clearSearch();
    },
    commitSearchQuery,
    currentLocation,
    deactivateSearch() {
      setSearchReturnNavigationStack(null);
      deactivateSearch();
    },
    goToLocation(index: number) {
      if (activeSearchQuery !== null) {
        deactivateSearch();
      }

      setNavigationStack((currentStack) => {
        return currentStack.slice(0, index + 1);
      });
    },
    // Navigating flips this in the same render, before the effect starts the
    // request, so Add never paints a "nothing here" state for a new location.
    isLoading: isLoading || isAwaitingBrowse,
    issue,
    navigationStack,
    openFolder(folder: DriveFolder) {
      if (activeSearchQuery !== null) {
        setSearchReturnNavigationStack(navigationStack);
        suspendSearch();
      }

      setNavigationStack((currentStack) => {
        return buildDriveFolderNavigationStack({ currentStack, folder });
      });
    },
    playableSources:
      activeSearchQuery === null
        ? browseSnapshot.playableSources
        : searchSnapshot.playableSources,
    refresh() {
      if (authState.status === 'expired') {
        setIssue(null);
        void onAuthorizationRequired?.();
        return;
      }

      if (authState.status !== 'authorized' || !authState.accessToken) {
        return;
      }

      setRefreshCount((currentValue) => currentValue + 1);
    },
    recentSearchTerms,
    returnToSearchResults() {
      if (searchReturnNavigationStack === null) {
        return;
      }

      setNavigationStack(searchReturnNavigationStack);
      setSearchReturnNavigationStack(null);
      restoreSearch();
    },
    searchQuery,
    searchResults: searchSnapshot.results,
    searchSelection,
    searchSnapshot,
    selectRoot(rootKind: DriveBrowseLocation['rootKind']) {
      const rootLocation = createRootLocation(rootKind);

      setSearchReturnNavigationStack(null);
      deactivateSearch();
      setNavigationStack([rootLocation]);
    },
    setSearchQuery(value: string) {
      setSearchReturnNavigationStack(null);
      setSearchQuery(value);
    },
    submitSearch() {
      setSearchReturnNavigationStack(null);
      submitSearch();
    },
    submitSearchQuery(query: string) {
      setSearchReturnNavigationStack(null);
      submitSearchQuery(query);
    },
    unavailableSources:
      activeSearchQuery === null
        ? browseSnapshot.unavailableSources
        : searchSnapshot.unavailableSources,
  };
};
