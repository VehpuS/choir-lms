import {
  MY_DRIVE_ROOT_LOCATION,
  SHARED_FOLDERS_ROOT_LOCATION,
  browseDriveLocation,
  searchDriveAudioFiles,
  type DriveAuthorizationState,
  type DriveBrowseLocation,
  type DriveBrowseSnapshot,
  type DriveFolder,
  type DriveSearchSnapshot,
} from '@org/google-drive';
import { useEffect, useState } from 'react';

import { runtimeConfig } from '../../../config/runtime';
import {
  normalizeRecentSearchTerm,
  recordRecentSearchTerm,
} from '../utils/search-history';
import {
  ADD_RECENT_SEARCH_HISTORY_KEY,
  persistRecentSearchHistory,
  restoreRecentSearchHistory,
} from '../utils/search-history-storage';

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

const EMPTY_SEARCH: DriveSearchSnapshot = {
  query: '',
  playableSources: [],
  unavailableSources: [],
};

const DEFAULT_LIBRARY_ERROR = 'Drive library could not be loaded.';

export const useDriveLibrary = (authState: DriveAuthorizationState) => {
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
  const [searchSnapshot, setSearchSnapshot] =
    useState<DriveSearchSnapshot>(EMPTY_SEARCH);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearchTerms, setRecentSearchTerms] = useState<string[]>([]);
  const [hasLoadedRecentSearchTerms, setHasLoadedRecentSearchTerms] =
    useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const currentLocation =
    navigationStack[navigationStack.length - 1] ??
    createRootLocation('my-drive');

  const clearActiveSearch = () => {
    setActiveSearchQuery(null);
    setSearchSnapshot(EMPTY_SEARCH);
    setIssue(null);
  };

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);

    if (normalizeRecentSearchTerm(value)) {
      return;
    }

    clearActiveSearch();
  };

  const submitSearchQuery = (query: string) => {
    const nextQuery = normalizeRecentSearchTerm(query);

    if (!nextQuery) {
      clearActiveSearch();
      setSearchQuery('');
      return;
    }

    setIssue(null);
    setSearchQuery(nextQuery);
    // Clear previous result counts while the next query is fetching.
    setSearchSnapshot({
      ...EMPTY_SEARCH,
      query: nextQuery,
    });
    setActiveSearchQuery(nextQuery);
    setRecentSearchTerms((currentSearchTerms) => {
      return recordRecentSearchTerm(currentSearchTerms, nextQuery);
    });
    setRefreshCount((currentValue) => currentValue + 1);
  };

  useEffect(() => {
    let isDisposed = false;

    void restoreRecentSearchHistory(ADD_RECENT_SEARCH_HISTORY_KEY)
      .then((restoredRecentSearchTerms) => {
        if (isDisposed) {
          return;
        }

        setRecentSearchTerms(restoredRecentSearchTerms);
      })
      .finally(() => {
        if (isDisposed) {
          return;
        }

        setHasLoadedRecentSearchTerms(true);
      });

    return () => {
      isDisposed = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedRecentSearchTerms) {
      return;
    }

    void persistRecentSearchHistory(
      ADD_RECENT_SEARCH_HISTORY_KEY,
      recentSearchTerms,
    );
  }, [hasLoadedRecentSearchTerms, recentSearchTerms]);

  useEffect(() => {
    const accessToken = authState.accessToken;

    if (authState.status !== 'authorized' || !accessToken) {
      setBrowseSnapshot(createEmptyBrowseSnapshot(currentLocation));
      setSearchSnapshot(EMPTY_SEARCH);
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

        setSearchSnapshot(nextSearchSnapshot);
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
    refreshCount,
  ]);

  return {
    activeSearchQuery,
    browseSnapshot,
    clearSearch() {
      clearActiveSearch();
      setSearchQuery('');
    },
    currentLocation,
    goToLocation(index: number) {
      setActiveSearchQuery(null);
      setIssue(null);
      setNavigationStack((currentStack) => {
        return currentStack.slice(0, index + 1);
      });
    },
    isLoading,
    issue,
    navigationStack,
    openFolder(folder: DriveFolder) {
      setActiveSearchQuery(null);
      setIssue(null);
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

      clearActiveSearch();
      setNavigationStack([rootLocation]);
      setBrowseSnapshot(createEmptyBrowseSnapshot(rootLocation));
    },
    setSearchQuery: updateSearchQuery,
    submitSearch() {
      submitSearchQuery(searchQuery);
    },
    submitSearchQuery(query: string) {
      submitSearchQuery(query);
    },
    unavailableSources:
      activeSearchQuery === null
        ? browseSnapshot.unavailableSources
        : searchSnapshot.unavailableSources,
  };
};
