import type {
  PlayableItem,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import {
  resolveRehearsalLibraryTagMatches,
  type RehearsalLibraryEntityCollections,
} from '@org/audio-library-runtime';
import { useMemo, useState } from 'react';

import { SavedLibraryDetailCardShell } from '../../../components/saved-library-detail-card-shell';
import type { PlaylistDetailHeaderPlaybackAction } from '../../../playlists/utils/saved-playlist-playback-view-model';
import { ContextualSearchPanel } from '../../../search/components/contextual-search-panel';
import { useTagDetailHeaderPlayback } from '../../hooks/use-tag-detail-header-playback';
import { useTagDetailHeaderSearchActions } from '../../hooks/use-tag-detail-header-search-actions';
import type { TagDetailHeaderSearchActions } from '../../hooks/use-tag-detail-header-search-actions';
import { resolveTagQueuePlayableItems } from '../../utils/tag-queue-playback';
import { TagMatchControlsPanel } from '../tag-match-list/controls-panel';
import { TagMatchList } from '../tag-match-list';
import {
  DEFAULT_TAG_MATCH_LIST_SORT_STATE,
  filterTagMatchesByQuery,
  filterTagMatchesByType,
  type TagMatchListSortState,
  type TagMatchTypeFilterValue,
} from '../tag-match-list/model';

const TAG_DETAIL_EYEBROW = 'Tag';
const TAG_DETAIL_CLOSE_ACCESSIBILITY_LABEL = 'Close tag detail';

type TagDetailSectionProps = {
  entityCollections: RehearsalLibraryEntityCollections;
  fileLinks: RehearsalLibraryFileLinkNode[];
  folders: RehearsalLibraryFolderNode[];
  onClose: () => void;
  onDetailPlaybackChange?: (
    action: PlaylistDetailHeaderPlaybackAction | null,
  ) => void;
  onDetailSearchActionsChange?: (
    actions: TagDetailHeaderSearchActions | null,
  ) => void;
  onOpenFolder: (folderId: string) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onPlayMatches: (items: PlayableItem[]) => void;
  tag: string;
};

const getTagSearchHelperCopy = (tag: string) => {
  return `Search tracks, loops, playlists, and folders tagged "${tag}".`;
};

const getTagSearchPlaceholderCopy = (tag: string) => {
  return `Search "${tag}" matches`;
};

export const TagDetailSection = ({
  entityCollections,
  fileLinks,
  folders,
  onClose,
  onDetailPlaybackChange,
  onDetailSearchActionsChange,
  onOpenFolder,
  onOpenPlaylist,
  onPlayMatches,
  tag,
}: TagDetailSectionProps) => {
  const [isFilterPopoverVisible, setIsFilterPopoverVisible] = useState(false);
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilters, setSelectedTypeFilters] = useState<
    TagMatchTypeFilterValue[]
  >([]);
  const [sortState, setSortState] = useState<TagMatchListSortState>(
    DEFAULT_TAG_MATCH_LIST_SORT_STATE,
  );
  const matches = useMemo(() => {
    return resolveRehearsalLibraryTagMatches(tag, { entityCollections, folders });
  }, [tag, entityCollections, folders]);
  const visibleMatches = useMemo(() => {
    return filterTagMatchesByQuery(
      filterTagMatchesByType(matches, selectedTypeFilters),
      searchQuery,
    );
  }, [matches, selectedTypeFilters, searchQuery]);
  const playableItems = useMemo(() => {
    return resolveTagQueuePlayableItems(visibleMatches, {
      fileLinks,
      folders,
      loops: entityCollections.loops,
      sources: entityCollections.sources,
    });
  }, [visibleMatches, fileLinks, folders, entityCollections]);
  const hasActiveFilters = selectedTypeFilters.length > 0;

  useTagDetailHeaderPlayback({
    onDetailPlaybackChange,
    onPlayMatches,
    playableItems,
    tag,
  });
  useTagDetailHeaderSearchActions({
    hasActiveFilters,
    isFilterPopoverVisible,
    isSearchBarVisible,
    onDetailSearchActionsChange,
    onToggleFilterPopover: () => {
      setIsFilterPopoverVisible((currentValue) => !currentValue);
    },
    onToggleSearchBar: () => {
      setIsSearchBarVisible((currentValue) => !currentValue);
    },
  });

  return (
    <SavedLibraryDetailCardShell
      closeAccessibilityLabel={TAG_DETAIL_CLOSE_ACCESSIBILITY_LABEL}
      eyebrow={TAG_DETAIL_EYEBROW}
      metadataLabel=""
      onClose={onClose}
      title={tag}
    >
      {isSearchBarVisible ? (
        <ContextualSearchPanel
          canShowRecentSearchTerms={false}
          clearActionLabel="Clear search"
          helperCopy={getTagSearchHelperCopy(tag)}
          isSearchBarVisible
          onClearSearch={() => {
            setSearchQuery('');
          }}
          onSearch={() => undefined}
          onSearchQueryChange={setSearchQuery}
          onSelectRecentSearchTerm={() => undefined}
          onToggleSearchBar={() => {
            setIsSearchBarVisible(false);
          }}
          placeholderCopy={getTagSearchPlaceholderCopy(tag)}
          recentSearchTerms={[]}
          searchAccessibilityLabel="Search this tag's matches"
          searchQuery={searchQuery}
          showInlineToggleButton={false}
        />
      ) : null}
      {isFilterPopoverVisible ? (
        <TagMatchControlsPanel
          onChangeSortState={setSortState}
          onToggleTypeFilter={(value) => {
            setSelectedTypeFilters((currentValue) => {
              return currentValue.includes(value)
                ? currentValue.filter((filterValue) => filterValue !== value)
                : [...currentValue, value];
            });
          }}
          selectedTypeFilters={selectedTypeFilters}
          sortState={sortState}
        />
      ) : null}
      <TagMatchList
        hasUnfilteredMatches={matches.length > 0}
        matches={visibleMatches}
        onOpenFolder={onOpenFolder}
        onOpenPlaylist={onOpenPlaylist}
        sortState={sortState}
      />
    </SavedLibraryDetailCardShell>
  );
};
