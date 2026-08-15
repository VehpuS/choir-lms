import {
  MY_DRIVE_ROOT_LOCATION,
  SHARED_FOLDERS_ROOT_LOCATION,
  browseDriveLocation,
  searchDriveAudioFiles,
  type DriveAuthorizationState,
  type DriveBrowseLocation,
  type DriveBrowseSnapshot,
  type DriveFolder,
} from '@org/google-drive';
import { useCallback, useEffect, useState } from 'react';

import { runtimeConfig } from '../../../../config/runtime';
import { isDriveAuthorizationFailure } from '../../../auth/google-drive/utils/authorization';
import {
  EMPTY_DRIVE_SEARCH_SNAPSHOT,
  useDriveLibrarySearch,
} from './use-drive-library-search';

const createRootLocation = (rootKind: DriveBrowseLocation['rootKind']) => {
  return {
    ...(rootKind === 'my-drive'
      ? MY_DRIVE_ROOT_LOCATION
      : SHARED_FOLDERS_ROOT_LOCATION),
  } satisfies DriveBrowseLocation;
};

const createEmptyBrowseSnapshot = (
  location: DriveBrowseLocation,
): DriveBrowseSnapshot => {
  return {
    location,
    folders: [],
    playableSources: [],
    unavailableSources: [],
  };
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
  const [browseSnapshot, setBrowseSnapshot] = useState<DriveBrowseSnapshot>(
    () => {
      const rootLocation = createRootLocation('my-drive');

      return createEmptyBrowseSnapshot(rootLocation);
    },
  );
  const [isLoading, setIsLoading] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const currentLocation =
    navigationStack[navigationStack.length - 1] ??
    createRootLocation('my-drive');

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
    searchQuery,
    searchSnapshot,
    setSearchQuery,
    submitSearch,
    submitSearchQuery,
  } = useDriveLibrarySearch({
    authState,
    onAuthorizationRequired,
    onClearIssue: clearIssue,
    onSearchRequested: () => {
      setRefreshCount((currentValue) => currentValue + 1);
    },
  });

  useEffect(() => {
    const accessToken = authState.accessToken;

    if (authState.status !== 'authorized' || !accessToken) {
      setBrowseSnapshot(createEmptyBrowseSnapshot(currentLocation));
      replaceSearchSnapshot(EMPTY_DRIVE_SEARCH_SNAPSHOT);
      setIssue(null);
      setIsLoading(false);
      return;
    }

    let isDisposed = false;
    const abortController = new AbortController();

    setIsLoading(true);
    setIssue(null);

    const loadDiscovery = async () => {
      if (activeSearchQuery) {
        const nextSearchSnapshot = await searchDriveAudioFiles({
          accessToken,
          location: currentLocation,
          query: activeSearchQuery,
          supportedMimeTypes: runtimeConfig.supportedAudioMimeTypes,
          supportedExtensions: runtimeConfig.supportedAudioExtensions,
          signal: abortController.signal,
        });

        if (isDisposed) {
          return;
        }

        replaceSearchSnapshot(nextSearchSnapshot);
        return;
      }

      const nextBrowseSnapshot = await browseDriveLocation({
        accessToken,
        location: currentLocation,
        supportedMimeTypes: runtimeConfig.supportedAudioMimeTypes,
        supportedExtensions: runtimeConfig.supportedAudioExtensions,
        signal: abortController.signal,
      });

      if (isDisposed) {
        return;
      }

      setBrowseSnapshot(nextBrowseSnapshot);
    };

    void loadDiscovery()
      .catch((error: unknown) => {
        if (isDisposed) {
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
        if (isDisposed) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isDisposed = true;
      abortController.abort();
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
    clearSearch,
    commitSearchQuery,
    currentLocation,
    deactivateSearch,
    goToLocation(index: number) {
      deactivateSearch();
      setNavigationStack((currentStack) => {
        return currentStack.slice(0, index + 1);
      });
    },
    isLoading,
    issue,
    navigationStack,
    openFolder(folder: DriveFolder) {
      deactivateSearch();
      setNavigationStack((currentStack) => {
        return [
          ...currentStack,
          {
            id: folder.id,
            kind: 'folder',
            name: folder.name,
            rootKind: folder.rootKind,
          },
        ];
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
    searchQuery,
    searchSnapshot,
    selectRoot(rootKind: DriveBrowseLocation['rootKind']) {
      const rootLocation = createRootLocation(rootKind);

      setNavigationStack([rootLocation]);
      setBrowseSnapshot(createEmptyBrowseSnapshot(rootLocation));
    },
    setSearchQuery,
    submitSearch,
    submitSearchQuery,
    unavailableSources:
      activeSearchQuery === null
        ? browseSnapshot.unavailableSources
        : searchSnapshot.unavailableSources,
  };
};
