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

const normalizeTagToken = (value: string) => {
  return value.trim();
};

const resolveAvailableTagFilters = (options: {
  savedLibrarySources: DriveLibrarySource[];
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
}) => {
  const uniqueTagsByKey = new Map<string, string>();

  const collectTags = (tags: string[] | undefined) => {
    if (!tags) {
      return;
    }

    for (const tag of tags) {
      const normalizedTag = normalizeTagToken(tag);

      if (!normalizedTag) {
        continue;
      }

      const tagKey = normalizedTag.toLocaleLowerCase();

      if (!uniqueTagsByKey.has(tagKey)) {
        uniqueTagsByKey.set(tagKey, normalizedTag);
      }
    }
  };

  for (const source of options.savedLibrarySources) {
    collectTags(source.tags);
  }

  for (const loop of options.savedLoops) {
    collectTags(loop.tags);
  }

  for (const playlist of options.savedPlaylists) {
    collectTags(playlist.tags);
  }

  return [...uniqueTagsByKey.values()].sort((leftTag, rightTag) => {
    return leftTag.localeCompare(rightTag, undefined, {
      sensitivity: 'base',
    });
  });
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
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
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
      selectedTagFilters,
      sources: savedLibrarySources,
    });
  }, [
    activeLibrarySearchQuery,
    availabilityFilter,
    entityFilter,
    savedLibrarySources,
    selectedTagFilters,
  ]);
  const visibleSavedLoops = useMemo(() => {
    return filterSavedLoopsByQuery({
      activeSearchQuery: activeLibrarySearchQuery,
      availabilityFilter,
      entityFilter,
      loops: savedLoops,
      selectedTagFilters,
      sources: savedLibrarySources,
    });
  }, [
    activeLibrarySearchQuery,
    availabilityFilter,
    entityFilter,
    savedLibrarySources,
    savedLoops,
    selectedTagFilters,
  ]);
  const visiblePlaylistCards = useMemo(() => {
    return resolveSavedPlaylistCards(
      filterSavedPlaylistsByQuery({
        activeSearchQuery: activeLibrarySearchQuery,
        availabilityFilter,
        entityFilter,
        playlists: savedPlaylists,
        selectedTagFilters,
      }),
    );
  }, [
    activeLibrarySearchQuery,
    availabilityFilter,
    entityFilter,
    savedPlaylists,
    selectedTagFilters,
  ]);
  const availableTagFilters = useMemo(() => {
    return resolveAvailableTagFilters({
      savedLibrarySources,
      savedLoops,
      savedPlaylists,
    });
  }, [savedLibrarySources, savedLoops, savedPlaylists]);

  return {
    activeLibrarySearchQuery,
    availableTagFilters,
    availabilityFilter,
    clearLibrarySearch() {
      debouncedLibrarySearch.cancel();
      setAvailabilityFilter('all');
      setEntityFilter('all');
      setSelectedTagFilters([]);
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
    selectedTagFilters,
    setAvailabilityFilter,
    setEntityFilter,
    toggleTagFilter(tag: string) {
      setSelectedTagFilters((currentTagFilters) => {
        return currentTagFilters.includes(tag)
          ? currentTagFilters.filter((currentTagFilter) => {
              return currentTagFilter !== tag;
            })
          : [...currentTagFilters, tag];
      });
    },
    visiblePlaylistCards,
    visibleSavedLibrarySources,
    visibleSavedLoops,
  };
};
