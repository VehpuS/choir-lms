import { useCallback, useEffect, useState } from 'react';

import { recordRecentSearchTerm } from '../utils/search-history';
import {
  persistRecentSearchHistory,
  restoreRecentSearchHistory,
} from '../utils/search-history-storage';

type UseRecentSearchHistoryOptions = {
  storageKey: string;
};

export const useRecentSearchHistory = ({
  storageKey,
}: UseRecentSearchHistoryOptions) => {
  const [recentSearchTerms, setRecentSearchTerms] = useState<string[]>([]);
  const [hasLoadedRecentSearchTerms, setHasLoadedRecentSearchTerms] =
    useState(false);

  useEffect(() => {
    let isDisposed = false;

    void restoreRecentSearchHistory(storageKey)
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
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoadedRecentSearchTerms) {
      return;
    }

    void persistRecentSearchHistory(storageKey, recentSearchTerms);
  }, [hasLoadedRecentSearchTerms, recentSearchTerms, storageKey]);

  const recordSearchTerm = useCallback((query: string) => {
    setRecentSearchTerms((currentSearchTerms) => {
      return recordRecentSearchTerm(currentSearchTerms, query);
    });
  }, []);

  return {
    recentSearchTerms,
    recordSearchTerm,
  };
};
