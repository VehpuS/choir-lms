import {
  type DriveAuthorizationState,
  type DriveSearchSnapshot,
} from '@org/google-drive';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { createDebouncedSearchRunner } from '../../search/utils/debounced-search-runner';
import {
  normalizeRecentSearchTerm,
  recordRecentSearchTerm,
} from '../../search/utils/search-history';
import {
  ADD_RECENT_SEARCH_HISTORY_KEY,
  persistRecentSearchHistory,
  restoreRecentSearchHistory,
} from '../../search/utils/search-history-storage';
import { resolveSearchInputValue } from '../../search/utils/search-input-value';

const DRIVE_SEARCH_DEBOUNCE_MS = 300;

export const EMPTY_DRIVE_SEARCH_SNAPSHOT: DriveSearchSnapshot = {
  query: '',
  playableSources: [],
  unavailableSources: [],
};

type UseDriveLibrarySearchOptions = {
  authState: DriveAuthorizationState;
  onAuthorizationRequired?: () => Promise<void> | void;
  onClearIssue: () => void;
  onSearchRequested: () => void;
};

export const useDriveLibrarySearch = ({
  authState,
  onAuthorizationRequired,
  onClearIssue,
  onSearchRequested,
}: UseDriveLibrarySearchOptions) => {
  const [searchSnapshot, setSearchSnapshot] = useState<DriveSearchSnapshot>(
    EMPTY_DRIVE_SEARCH_SNAPSHOT,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearchTerms, setRecentSearchTerms] = useState<string[]>([]);
  const [hasLoadedRecentSearchTerms, setHasLoadedRecentSearchTerms] =
    useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState<string | null>(
    null,
  );

  const clearActiveSearch = useCallback(() => {
    setActiveSearchQuery(null);
    setSearchSnapshot(EMPTY_DRIVE_SEARCH_SNAPSHOT);
    onClearIssue();
  }, [onClearIssue]);

  const commitSearchQuery = useCallback((query: string) => {
    const nextQuery = normalizeRecentSearchTerm(query);

    if (!nextQuery) {
      return;
    }

    setRecentSearchTerms((currentSearchTerms) => {
      return recordRecentSearchTerm(currentSearchTerms, nextQuery);
    });
  }, []);

  const runSearchQuery = useCallback(
    (query: string) => {
      const nextQuery = normalizeRecentSearchTerm(query);

      if (!nextQuery) {
        clearActiveSearch();
        return;
      }

      onClearIssue();
      setSearchSnapshot({
        ...EMPTY_DRIVE_SEARCH_SNAPSHOT,
        query: nextQuery,
      });
      setActiveSearchQuery(nextQuery);
      onSearchRequested();
    },
    [clearActiveSearch, onClearIssue, onSearchRequested],
  );

  const debouncedSearch = useMemo(() => {
    return createDebouncedSearchRunner({
      debounceMs: DRIVE_SEARCH_DEBOUNCE_MS,
      runSearch: runSearchQuery,
    });
  }, [runSearchQuery]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const updateSearchQuery = useCallback(
    (value: string) => {
      setSearchQuery(value);

      if (normalizeRecentSearchTerm(value)) {
        debouncedSearch.schedule(value);
        return;
      }

      debouncedSearch.cancel();
      clearActiveSearch();
    },
    [clearActiveSearch, debouncedSearch],
  );

  const runSubmittedSearchQuery = useCallback(
    (
      query: string,
      options: {
        syncInputValue?: boolean;
      } = {},
    ) => {
      const nextSearchInputValue = resolveSearchInputValue({
        currentInputValue: searchQuery,
        query,
        syncInputValue: options.syncInputValue ?? false,
      });

      if (nextSearchInputValue !== searchQuery) {
        setSearchQuery(nextSearchInputValue);
      }

      debouncedSearch.flush(query);

      if (!normalizeRecentSearchTerm(query) || authState.status !== 'expired') {
        return;
      }

      onClearIssue();
      void onAuthorizationRequired?.();
    },
    [
      authState.status,
      debouncedSearch,
      onAuthorizationRequired,
      onClearIssue,
      searchQuery,
    ],
  );

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

  return {
    activeSearchQuery,
    clearSearch() {
      debouncedSearch.cancel();
      clearActiveSearch();
      setSearchQuery('');
    },
    commitSearchQuery() {
      commitSearchQuery(searchQuery);
    },
    deactivateSearch() {
      debouncedSearch.cancel();
      clearActiveSearch();
    },
    recentSearchTerms,
    replaceSearchSnapshot: setSearchSnapshot,
    searchQuery,
    searchSnapshot,
    setSearchQuery: updateSearchQuery,
    submitSearch() {
      runSubmittedSearchQuery(searchQuery);
    },
    submitSearchQuery(query: string) {
      runSubmittedSearchQuery(query, {
        syncInputValue: true,
      });
    },
  };
};
