import { type NamedLoop, type Playlist } from '@org/audio-library-models';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { resolveSavedPlaylistCards } from '../../playlists/utils/saved-playlist-card-view-model';
import { createDebouncedSearchRunner } from '../../search/utils/debounced-search-runner';
import {
  filterSavedLibrarySourcesByQuery,
  filterSavedLoopsByQuery,
  filterSavedPlaylistsByQuery,
  type LibrarySearchAvailabilityFilter,
  type LibrarySearchEntityFilter,
  resolveActiveLibrarySearchQuery,
} from '../../search/utils/saved-library-search-view-model';
import {
  normalizeRecentSearchTerm,
  recordRecentSearchTerm,
} from '../../search/utils/search-history';
import {
  LIBRARY_RECENT_SEARCH_HISTORY_KEY,
  persistRecentSearchHistory,
  restoreRecentSearchHistory,
} from '../../search/utils/search-history-storage';

type UseSavedRehearsalLibrarySearchOptions = {
  savedLibrarySources: DriveLibrarySource[];
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
};

const LIBRARY_SEARCH_DEBOUNCE_MS = 200;

export const useSavedRehearsalLibrarySearch = ({
  savedLibrarySources,
  savedLoops,
  savedPlaylists,
}: UseSavedRehearsalLibrarySearchOptions) => {
  const [availabilityFilter, setAvailabilityFilter] =
    useState<LibrarySearchAvailabilityFilter>('all');
  const [entityFilter, setEntityFilter] =
    useState<LibrarySearchEntityFilter>('all');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [recentLibrarySearchTerms, setRecentLibrarySearchTerms] = useState<
    string[]
  >([]);
  const [
    hasLoadedRecentLibrarySearchTerms,
    setHasLoadedRecentLibrarySearchTerms,
  ] = useState(false);
  const [activeLibrarySearchQuery, setActiveLibrarySearchQuery] = useState<
    string | null
  >(null);

  useEffect(() => {
    let isUnrendered = false;

    void restoreRecentSearchHistory(LIBRARY_RECENT_SEARCH_HISTORY_KEY)
      .then((restoredRecentSearchTerms) => {
        if (isUnrendered) {
          return;
        }

        setRecentLibrarySearchTerms(restoredRecentSearchTerms);
      })
      .finally(() => {
        if (isUnrendered) {
          return;
        }

        setHasLoadedRecentLibrarySearchTerms(true);
      });

    return () => {
      isUnrendered = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedRecentLibrarySearchTerms) {
      return;
    }

    void persistRecentSearchHistory(
      LIBRARY_RECENT_SEARCH_HISTORY_KEY,
      recentLibrarySearchTerms,
    );
  }, [hasLoadedRecentLibrarySearchTerms, recentLibrarySearchTerms]);

  const runLibrarySearch = useCallback(
    (
      query: string,
      options: {
        recordRecentSearch: boolean;
      } = {
        recordRecentSearch: true,
      },
    ) => {
      const nextQuery = normalizeRecentSearchTerm(query);

      setActiveLibrarySearchQuery(resolveActiveLibrarySearchQuery(query));

      if (!options.recordRecentSearch || !nextQuery) {
        return;
      }

      setRecentLibrarySearchTerms((currentSearchTerms) => {
        return recordRecentSearchTerm(currentSearchTerms, nextQuery);
      });
    },
    [],
  );

  const debouncedLibrarySearch = useMemo(() => {
    return createDebouncedSearchRunner({
      debounceMs: LIBRARY_SEARCH_DEBOUNCE_MS,
      runSearch: runLibrarySearch,
    });
  }, [runLibrarySearch]);

  useEffect(() => {
    return () => {
      debouncedLibrarySearch.cancel();
    };
  }, [debouncedLibrarySearch]);

  const visibleSavedLibrarySources = useMemo(() => {
    return filterSavedLibrarySourcesByQuery({
      activeSearchQuery: activeLibrarySearchQuery,
      availabilityFilter,
      entityFilter,
      sources: savedLibrarySources,
    });
  }, [
    activeLibrarySearchQuery,
    availabilityFilter,
    entityFilter,
    savedLibrarySources,
  ]);
  const visibleSavedLoops = useMemo(() => {
    return filterSavedLoopsByQuery({
      activeSearchQuery: activeLibrarySearchQuery,
      availabilityFilter,
      entityFilter,
      loops: savedLoops,
      sources: savedLibrarySources,
    });
  }, [
    activeLibrarySearchQuery,
    availabilityFilter,
    entityFilter,
    savedLibrarySources,
    savedLoops,
  ]);
  const visiblePlaylistCards = useMemo(() => {
    return resolveSavedPlaylistCards(
      filterSavedPlaylistsByQuery({
        activeSearchQuery: activeLibrarySearchQuery,
        availabilityFilter,
        entityFilter,
        playlists: savedPlaylists,
      }),
    );
  }, [
    activeLibrarySearchQuery,
    availabilityFilter,
    entityFilter,
    savedPlaylists,
  ]);

  return {
    activeLibrarySearchQuery,
    availabilityFilter,
    clearLibrarySearch() {
      debouncedLibrarySearch.cancel();
      setAvailabilityFilter('all');
      setEntityFilter('all');
      setLibrarySearchQuery('');
      setActiveLibrarySearchQuery(null);
    },
    deactivateLibrarySearch() {
      debouncedLibrarySearch.cancel();
      setActiveLibrarySearchQuery(null);
    },
    entityFilter,
    handleLibrarySearchQueryChange(value: string) {
      setLibrarySearchQuery(value);

      if (resolveActiveLibrarySearchQuery(value)) {
        debouncedLibrarySearch.schedule(value);
        return;
      }

      debouncedLibrarySearch.cancel();
      setAvailabilityFilter('all');
      setEntityFilter('all');
      setActiveLibrarySearchQuery(null);
    },
    isLibrarySearchMode: activeLibrarySearchQuery !== null,
    librarySearchQuery,
    recentLibrarySearchTerms,
    runLibrarySearch(query: string) {
      debouncedLibrarySearch.cancel();
      setLibrarySearchQuery(normalizeRecentSearchTerm(query) ?? '');
      runLibrarySearch(query);
    },
    submitLibrarySearch() {
      debouncedLibrarySearch.flush(librarySearchQuery);
    },
    setAvailabilityFilter,
    setEntityFilter,
    visiblePlaylistCards,
    visibleSavedLibrarySources,
    visibleSavedLoops,
  };
};
