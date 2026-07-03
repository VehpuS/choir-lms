import { type NamedLoop, type Playlist } from '@org/audio-library-models';
import { useEffect, useMemo, useState } from 'react';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { resolveSavedPlaylistCards } from '../../playlists/utils/saved-playlist-card-view-model';
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

  const runLibrarySearch = (query: string) => {
    const nextQuery = normalizeRecentSearchTerm(query);

    setLibrarySearchQuery(nextQuery ?? '');
    setActiveLibrarySearchQuery(resolveActiveLibrarySearchQuery(query));

    if (nextQuery) {
      setRecentLibrarySearchTerms((currentSearchTerms) => {
        return recordRecentSearchTerm(currentSearchTerms, nextQuery);
      });
    }
  };

  return {
    activeLibrarySearchQuery,
    availabilityFilter,
    clearLibrarySearch() {
      setAvailabilityFilter('all');
      setEntityFilter('all');
      setLibrarySearchQuery('');
      setActiveLibrarySearchQuery(null);
    },
    entityFilter,
    handleLibrarySearchQueryChange(value: string) {
      setLibrarySearchQuery(value);

      if (resolveActiveLibrarySearchQuery(value)) {
        return;
      }

      setAvailabilityFilter('all');
      setEntityFilter('all');
      setActiveLibrarySearchQuery(null);
    },
    isLibrarySearchMode: activeLibrarySearchQuery !== null,
    librarySearchQuery,
    recentLibrarySearchTerms,
    runLibrarySearch,
    submitLibrarySearch() {
      runLibrarySearch(librarySearchQuery);
    },
    setAvailabilityFilter,
    setEntityFilter,
    visiblePlaylistCards,
    visibleSavedLibrarySources,
    visibleSavedLoops,
  };
};
