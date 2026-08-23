import { type NamedLoop, type Playlist } from '@org/audio-library-models';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { resolveSavedPlaylistCards } from '../../playlists/utils/saved-playlist-card-view-model';
import {
  DEFAULT_SAVED_PLAYLIST_SORT_STATE,
  sortSavedPlaylistsBy,
} from './browse-playlist-cards-model';
import {
  DEFAULT_SAVED_SOURCE_SORT_STATE,
  sortSavedSourcesBy,
} from './browse-source-group-model';
import { useFieldSortState } from '../use-field-sort-state';
import { resolveEntityFilterOnViewChange } from './entity-filter-view-change';
import {
  DEFAULT_SAVED_LOOP_SORT_STATE,
  sortSavedLoopsBy,
} from '../../loops/utils/saved-loop-sort-model';
import {
  DEFAULT_LIBRARY_FILES_SORT_DIRECTION,
  DEFAULT_LIBRARY_FILES_SORT_MODE,
  type LibraryFilesSearchScope,
  type LibraryFilesSortDirection,
  type LibraryFilesSortMode,
} from '../../saved-rehearsal-library/library-files-model';
import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';
import { DEFAULT_SAVED_TAGS_LIST_SORT_STATE } from '../../tags/components/saved-tags-list/model';
import { useRecentSearchHistory } from '../../search/hooks/use-recent-search-history';
import { createDebouncedSearchRunner } from '../../search/utils/debounced-search-runner';
import {
  filterSavedLibrarySourcesByQuery,
  filterSavedLoopsByQuery,
  filterSavedPlaylistsByQuery,
  resolveActiveLibrarySearchQuery,
  type LibrarySearchEntityFilter,
} from '../../search/utils/saved-library-search-view-model';
import { LIBRARY_RECENT_SEARCH_HISTORY_KEY } from '../../search/utils/search-history-storage';
import { resolveSearchInputValue } from '../../search/utils/search-input-value';
import {
  restoreLibraryFilesSearchState,
  type LibraryFilesSearchStateSnapshot,
} from './library-files-search-state';
import { resolveAvailableTagFilters } from './saved-rehearsal-library-tag-filters';

type UseSavedRehearsalLibrarySearchOptions = {
  savedLibrarySources: DriveLibrarySource[];
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  selectedView: SavedRehearsalLibraryView;
};

const LIBRARY_SEARCH_DEBOUNCE_MS = 200;

export const useSavedRehearsalLibrarySearch = ({
  savedLibrarySources,
  savedLoops,
  savedPlaylists,
  selectedView,
}: UseSavedRehearsalLibrarySearchOptions) => {
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
  const [filesSortDirection, setFilesSortDirection] =
    useState<LibraryFilesSortDirection>(DEFAULT_LIBRARY_FILES_SORT_DIRECTION);
  const tagsSort = useFieldSortState(DEFAULT_SAVED_TAGS_LIST_SORT_STATE);
  const sourcesSort = useFieldSortState(DEFAULT_SAVED_SOURCE_SORT_STATE);
  const loopsSort = useFieldSortState(DEFAULT_SAVED_LOOP_SORT_STATE);
  const playlistsSort = useFieldSortState(DEFAULT_SAVED_PLAYLIST_SORT_STATE);
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

  useEffect(() => {
    setEntityFilter((currentEntityFilter) => {
      return resolveEntityFilterOnViewChange(
        activeLibrarySearchQuery,
        currentEntityFilter,
      );
    });
  }, [selectedView]);

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
    return sortSavedSourcesBy(
      filterSavedLibrarySourcesByQuery({
        activeSearchQuery: activeLibrarySearchQuery,
        entityFilter,
        selectedTagFilters,
        sources: savedLibrarySources,
      }),
      sourcesSort.sortState,
    );
  }, [
    activeLibrarySearchQuery,
    entityFilter,
    savedLibrarySources,
    selectedTagFilters,
    sourcesSort.sortState,
  ]);
  const visibleSavedLoops = useMemo(() => {
    return sortSavedLoopsBy(
      filterSavedLoopsByQuery({
        activeSearchQuery: activeLibrarySearchQuery,
        entityFilter,
        loops: savedLoops,
        selectedTagFilters,
        sources: savedLibrarySources,
      }),
      loopsSort.sortState,
    );
  }, [
    activeLibrarySearchQuery,
    entityFilter,
    loopsSort.sortState,
    savedLibrarySources,
    savedLoops,
    selectedTagFilters,
  ]);
  const visiblePlaylistCards = useMemo(() => {
    return sortSavedPlaylistsBy(
      resolveSavedPlaylistCards(
        filterSavedPlaylistsByQuery({
          activeSearchQuery: activeLibrarySearchQuery,
          entityFilter,
          playlists: savedPlaylists,
          selectedTagFilters,
        }),
      ),
      playlistsSort.sortState,
    );
  }, [
    activeLibrarySearchQuery,
    entityFilter,
    playlistsSort.sortState,
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
    clearLibrarySearch() {
      debouncedLibrarySearch.cancel();
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
      runSubmittedLibrarySearchQuery(query, { syncInputValue: true });
    },
    restoreLibraryFilesSearchState(options: LibraryFilesSearchStateSnapshot) {
      restoreLibraryFilesSearchState({
        ...options,
        cancelPendingSearch: debouncedLibrarySearch.cancel,
        setActiveLibrarySearchQuery,
        setFilesSearchScope,
        setFilesSortDirection,
        setFilesSortMode,
        setLibrarySearchQuery,
      });
    },
    submitLibrarySearch() {
      runSubmittedLibrarySearchQuery(librarySearchQuery);
    },
    selectedTagFilters,
    setEntityFilter,
    setFilesSearchScope,
    setFilesSortDirection,
    setFilesSortMode,
    setLoopsSortField: loopsSort.setField,
    setPlaylistsSortField: playlistsSort.setField,
    setSourcesSortField: sourcesSort.setField,
    setTagsSortField: tagsSort.setField,
    filesSortDirection,
    loopsSortState: loopsSort.sortState,
    playlistsSortState: playlistsSort.sortState,
    sourcesSortState: sourcesSort.sortState,
    tagsSortState: tagsSort.sortState,
    toggleFilesSortDirection() {
      setFilesSortDirection((currentDirection) => {
        return currentDirection === 'asc' ? 'desc' : 'asc';
      });
    },
    toggleLoopsSortDirection: loopsSort.toggleDirection,
    togglePlaylistsSortDirection: playlistsSort.toggleDirection,
    toggleSourcesSortDirection: sourcesSort.toggleDirection,
    toggleTagFilter(tag: string) {
      setSelectedTagFilters((currentTagFilters) => {
        return currentTagFilters.includes(tag)
          ? currentTagFilters.filter((currentTagFilter) => {
              return currentTagFilter !== tag;
            })
          : [...currentTagFilters, tag];
      });
    },
    toggleTagsSortDirection: tagsSort.toggleDirection,
    visiblePlaylistCards,
    visibleSavedLibrarySources,
    visibleSavedLoops,
  };
};
