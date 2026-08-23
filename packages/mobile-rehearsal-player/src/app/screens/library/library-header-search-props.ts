import type { SearchPanelVisibility } from '../../library/components/saved-rehearsal-library-section/search-shell';
import type { useSavedRehearsalLibrarySearch } from '../../library/components/saved-rehearsal-library-section/use-saved-rehearsal-library-search';
import type { useSavedRehearsalLibrarySearchPanel } from '../../library/components/saved-rehearsal-library-section/use-saved-rehearsal-library-search-panel';
import type { PlaylistDetailHeaderPlaybackAction } from '../../library/playlists/utils/saved-playlist-playback-view-model';
import type { SavedRehearsalLibraryView } from '../../library/saved-rehearsal-library/detail-mode';
import type { TagDetailHeaderSearchActions } from '../../library/tags/hooks/use-tag-detail-header-search-actions';

export type LibraryHeaderSearchProps = {
  canShowFilterPopover: boolean;
  canShowSearch: boolean;
  handleFilterActionPress: () => void;
  handleSearchActionPress: () => void;
  hasActiveFilters: boolean;
  searchPanelVisibility: SearchPanelVisibility;
};

/**
 * A detail view (currently just tag detail) can register its own
 * search/filter controls via `detailSearchActions` so the shared header
 * shows the actions for whatever is on screen, instead of duplicating a
 * second icon row inside the detail card and leaving the header's own
 * controls pointed at something else (the Tags list) behind it.
 */
export const resolveLibraryHeaderSearchProps = (options: {
  detailSearchActions: TagDetailHeaderSearchActions | null;
  playlistDetailPlayback: PlaylistDetailHeaderPlaybackAction | null;
  searchPanel: ReturnType<typeof useSavedRehearsalLibrarySearchPanel>;
  searchState: ReturnType<typeof useSavedRehearsalLibrarySearch>;
  selectedView: SavedRehearsalLibraryView;
}): LibraryHeaderSearchProps => {
  const {
    detailSearchActions,
    playlistDetailPlayback,
    searchPanel,
    searchState,
    selectedView,
  } = options;

  if (detailSearchActions) {
    return {
      canShowFilterPopover: detailSearchActions.canShowFilters,
      canShowSearch: true,
      handleFilterActionPress: detailSearchActions.onFilterActionPress,
      handleSearchActionPress: detailSearchActions.onSearchActionPress,
      hasActiveFilters: detailSearchActions.hasActiveFilters,
      searchPanelVisibility: {
        isFilterPopoverVisible: detailSearchActions.isFilterPopoverVisible,
        isSearchBarVisible: detailSearchActions.isSearchBarVisible,
      },
    };
  }

  return {
    canShowFilterPopover:
      selectedView === 'files' ||
      selectedView === 'loops' ||
      selectedView === 'tags' ||
      selectedView === 'tracks',
    canShowSearch: !playlistDetailPlayback,
    handleFilterActionPress: searchPanel.handleFilterActionPress,
    handleSearchActionPress: searchPanel.handleSearchActionPress,
    hasActiveFilters:
      searchState.entityFilter !== 'all' ||
      searchState.selectedTagFilters.length > 0,
    searchPanelVisibility: searchPanel.searchPanelVisibility,
  };
};
