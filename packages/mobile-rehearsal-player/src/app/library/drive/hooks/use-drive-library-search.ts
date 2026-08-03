import {
  type DriveAuthorizationState,
  type DriveSearchSnapshot,
} from '@org/google-drive';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRecentSearchHistory } from '../../search/hooks/use-recent-search-history';
import { createDebouncedSearchRunner } from '../../search/utils/debounced-search-runner';
import { normalizeRecentSearchTerm } from '../../search/utils/search-history';
import { ADD_RECENT_SEARCH_HISTORY_KEY } from '../../search/utils/search-history-storage';
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
  const [activeSearchQuery, setActiveSearchQuery] = useState<string | null>(
    null,
  );
  const { recentSearchTerms, recordSearchTerm } = useRecentSearchHistory({
    storageKey: ADD_RECENT_SEARCH_HISTORY_KEY,
  });

  const clearActiveSearch = useCallback(() => {
    setActiveSearchQuery(null);
    setSearchSnapshot(EMPTY_DRIVE_SEARCH_SNAPSHOT);
    onClearIssue();
  }, [onClearIssue]);

  const commitSearchQuery = useCallback(
    (query: string) => {
      recordSearchTerm(query);
    },
    [recordSearchTerm],
  );

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
