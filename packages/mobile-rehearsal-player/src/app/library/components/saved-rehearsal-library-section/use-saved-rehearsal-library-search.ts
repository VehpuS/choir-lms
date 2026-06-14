import { type NamedLoop, type Playlist } from '@org/audio-library-models';
import { useEffect, useMemo, useState } from 'react';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { resolveSavedPlaylistCards } from '../../playlists/utils/saved-playlist-card-view-model';
import {
  filterSavedLibrarySourcesByQuery,
  filterSavedLoopsByQuery,
  filterSavedPlaylistsByQuery,
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
      sources: savedLibrarySources,
    });
  }, [activeLibrarySearchQuery, savedLibrarySources]);
  const visibleSavedLoops = useMemo(() => {
    return filterSavedLoopsByQuery({
      activeSearchQuery: activeLibrarySearchQuery,
      loops: savedLoops,
    });
  }, [activeLibrarySearchQuery, savedLoops]);
  const visiblePlaylistCards = useMemo(() => {
    return resolveSavedPlaylistCards(
      filterSavedPlaylistsByQuery({
        activeSearchQuery: activeLibrarySearchQuery,
        playlists: savedPlaylists,
      }),
    );
  }, [activeLibrarySearchQuery, savedPlaylists]);

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
    clearLibrarySearch() {
      setLibrarySearchQuery('');
      setActiveLibrarySearchQuery(null);
    },
    handleLibrarySearchQueryChange(value: string) {
      setLibrarySearchQuery(value);

      if (resolveActiveLibrarySearchQuery(value)) {
        return;
      }

      setActiveLibrarySearchQuery(null);
    },
    isLibrarySearchMode: activeLibrarySearchQuery !== null,
    librarySearchQuery,
    recentLibrarySearchTerms,
    runLibrarySearch,
    submitLibrarySearch() {
      runLibrarySearch(librarySearchQuery);
    },
    visiblePlaylistCards,
    visibleSavedLibrarySources,
    visibleSavedLoops,
  };
};
