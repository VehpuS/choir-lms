import { type NamedLoop, type Playlist } from '@org/audio-library-models';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { resolveSavedPlaylistCards } from '../../playlists/utils/saved-playlist-card-view-model';
import {
  DEFAULT_LIBRARY_FILES_SORT_MODE,
  type LibraryFilesSearchScope,
  type LibraryFilesSortMode,
} from '../../saved-rehearsal-library/library-files-model';
import { useRecentSearchHistory } from '../../search/hooks/use-recent-search-history';
import { createDebouncedSearchRunner } from '../../search/utils/debounced-search-runner';
import {
  filterSavedLibrarySourcesByQuery,
  filterSavedLoopsByQuery,
  filterSavedPlaylistsByQuery,
  type LibrarySearchAvailabilityFilter,
  type LibrarySearchEntityFilter,
  resolveActiveLibrarySearchQuery,
} from '../../search/utils/saved-library-search-view-model';
import { LIBRARY_RECENT_SEARCH_HISTORY_KEY } from '../../search/utils/search-history-storage';
import { resolveSearchInputValue } from '../../search/utils/search-input-value';

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
  const [activeLibrarySearchQuery, setActiveLibrarySearchQuery] = useState<
    string | null
  >(null);
  const [filesSearchScope, setFilesSearchScope] =
    useState<LibraryFilesSearchScope>('current-folder');
  const [filesSortMode, setFilesSortMode] = useState<LibraryFilesSortMode>(
    DEFAULT_LIBRARY_FILES_SORT_MODE,
  );
  const [filesOpenedAtByNodeKey, setFilesOpenedAtByNodeKey] = useState<
    Record<string, string>
  >({});
  const { recentSearchTerms: recentLibrarySearchTerms, recordSearchTerm } =
    useRecentSearchHistory({
      storageKey: LIBRARY_RECENT_SEARCH_HISTORY_KEY,
    });

  const commitLibrarySearchQuery = useCallback(
    (query: string) => {
      recordSearchTerm(query);
    },
    [recordSearchTerm],
  );

  const applyLibrarySearchQuery = useCallback((query: string) => {
    setActiveLibrarySearchQuery(resolveActiveLibrarySearchQuery(query));
  }, []);

  const debouncedLibrarySearch = useMemo(() => {
    return createDebouncedSearchRunner({
      debounceMs: LIBRARY_SEARCH_DEBOUNCE_MS,
      runSearch: applyLibrarySearchQuery,
    });
  }, [applyLibrarySearchQuery]);

  useEffect(() => {
    return () => {
      debouncedLibrarySearch.cancel();
    };
  }, [debouncedLibrarySearch]);

  const runSubmittedLibrarySearchQuery = useCallback(
    (
      query: string,
      options: {
        syncInputValue?: boolean;
      } = {},
    ) => {
      const nextSearchInputValue = resolveSearchInputValue({
        currentInputValue: librarySearchQuery,
        query,
        syncInputValue: options.syncInputValue ?? false,
      });

      if (nextSearchInputValue !== librarySearchQuery) {
        setLibrarySearchQuery(nextSearchInputValue);
      }

      debouncedLibrarySearch.flush(query);
    },
    [debouncedLibrarySearch, librarySearchQuery],
  );

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
      setFilesSearchScope('current-folder');
      setSelectedTagFilters([]);
      setLibrarySearchQuery('');
      setActiveLibrarySearchQuery(null);
    },
    commitLibrarySearchQuery() {
      commitLibrarySearchQuery(librarySearchQuery);
    },
    deactivateLibrarySearch() {
      debouncedLibrarySearch.cancel();
      setActiveLibrarySearchQuery(null);
    },
    entityFilter,
    filesOpenedAtByNodeKey,
    filesSearchScope,
    filesSortMode,
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
    recordFilesEntryOpened(
      nodeKey: string,
      openedAt = new Date().toISOString(),
    ) {
      setFilesOpenedAtByNodeKey((currentValue) => {
        if (currentValue[nodeKey] === openedAt) {
          return currentValue;
        }

        return {
          ...currentValue,
          [nodeKey]: openedAt,
        };
      });
    },
    runLibrarySearch(query: string) {
      runSubmittedLibrarySearchQuery(query, {
        syncInputValue: true,
      });
    },
    submitLibrarySearch() {
      runSubmittedLibrarySearchQuery(librarySearchQuery);
    },
    selectedTagFilters,
    setAvailabilityFilter,
    setEntityFilter,
    setFilesSearchScope,
    setFilesSortMode,
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
