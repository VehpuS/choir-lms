import { StyleSheet, View } from 'react-native';

import { InteractionChip } from '../../components/interaction-chip';
import type {
  SavedPlaylistSortField,
  SavedPlaylistSortState,
} from '../../components/saved-rehearsal-library-section/browse-playlist-cards-model';
import type {
  SavedSourceSortField,
  SavedSourceSortState,
} from '../../components/saved-rehearsal-library-section/browse-source-group-model';
import { getLibrarySearchContextCopy } from '../../drive/utils/drive-library-view-model';
import type {
  SavedLoopSortField,
  SavedLoopSortState,
} from '../../loops/utils/saved-loop-sort-model';
import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';
import type {
  LibraryFilesSearchScope,
  LibraryFilesSortDirection,
  LibraryFilesSortMode,
} from '../../saved-rehearsal-library/library-files-model';
import type {
  SavedTagsListSortField,
  SavedTagsListSortState,
} from '../../tags/components/saved-tags-list/model';
import type {
  LibrarySearchEntityFilter,
  TagFilterMatchMode,
} from '../utils/saved-library-search-view-model';
import { resolveActiveFiltersSummaryLabel } from './library-search-active-filters-model';
import { ContextualSearchPanel } from './contextual-search-panel';
import { LibrarySearchFilterPopover } from './library-search-filter-popover';
import type { LibrarySearchControlsVisibility } from './library-search-controls-visibility';

export { LibrarySearchControlsActions } from './library-search-controls-actions';

type LibrarySearchControlsProps = LibrarySearchControlsVisibility & {
  availableTagFilters: string[];
  currentFilesFolderName: string | null;
  entityFilter: LibrarySearchEntityFilter;
  filesSearchScope: LibraryFilesSearchScope;
  filesSortDirection: LibraryFilesSortDirection;
  filesSortMode: LibraryFilesSortMode;
  hasActiveFilters: boolean;
  onClearSearch: () => void;
  onFilterActionPress: () => void;
  onSearch: () => void;
  onSearchActionPress: () => void;
  onSearchInputBlur: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectEntityFilter: (value: LibrarySearchEntityFilter) => void;
  onSelectFilesSearchScope: (value: LibraryFilesSearchScope) => void;
  onSelectFilesSortMode: (value: LibraryFilesSortMode) => void;
  onSelectLoopsSortField: (value: SavedLoopSortField) => void;
  onSelectPlaylistsSortField: (value: SavedPlaylistSortField) => void;
  onSelectRecentSearchTerm: (value: string) => void;
  onSelectSourcesSortField: (value: SavedSourceSortField) => void;
  onSelectTagsSortField: (value: SavedTagsListSortField) => void;
  onToggleFilesSortDirection: () => void;
  onToggleLoopsSortDirection: () => void;
  onTogglePlaylistsSortDirection: () => void;
  onToggleSourcesSortDirection: () => void;
  onToggleTagFilter: (value: string) => void;
  onToggleTagFilterMatchMode: () => void;
  onToggleTagsSortDirection: () => void;
  loopsSortState: SavedLoopSortState;
  playlistsSortState: SavedPlaylistSortState;
  recentSearchTerms: string[];
  selectedView: SavedRehearsalLibraryView;
  selectedTagFilters: string[];
  searchQuery: string;
  sourcesSortState: SavedSourceSortState;
  tagFilterMatchMode: TagFilterMatchMode;
  tagsSortState: SavedTagsListSortState;
};

export const LibrarySearchControls = ({
  availableTagFilters,
  currentFilesFolderName,
  entityFilter,
  filesSearchScope,
  filesSortDirection,
  filesSortMode,
  hasActiveFilters,
  isFilterPopoverVisible,
  isSearchBarVisible,
  onClearSearch,
  onFilterActionPress,
  onSearch,
  onSearchActionPress,
  onSearchInputBlur,
  onSearchQueryChange,
  onSelectEntityFilter,
  onSelectFilesSearchScope,
  onSelectFilesSortMode,
  onSelectLoopsSortField,
  onSelectPlaylistsSortField,
  onSelectRecentSearchTerm,
  onSelectSourcesSortField,
  onSelectTagsSortField,
  onToggleFilesSortDirection,
  onToggleLoopsSortDirection,
  onTogglePlaylistsSortDirection,
  onToggleSourcesSortDirection,
  onToggleTagFilter,
  onToggleTagFilterMatchMode,
  onToggleTagsSortDirection,
  loopsSortState,
  playlistsSortState,
  recentSearchTerms,
  selectedView,
  selectedTagFilters,
  searchQuery,
  sourcesSortState,
  tagFilterMatchMode,
  tagsSortState,
}: LibrarySearchControlsProps) => {
  const searchContextCopy = getLibrarySearchContextCopy();
  const searchHelperCopy =
    selectedView === 'files'
      ? `${searchContextCopy.helper} Scope: ${
          filesSearchScope === 'current-folder'
            ? currentFilesFolderName
              ? `This folder (${currentFilesFolderName})`
              : 'This folder'
            : 'All Files'
        }`
      : searchContextCopy.helper;

  const searchPanel = isSearchBarVisible ? (
    <ContextualSearchPanel
      clearActionLabel="Show all saved items"
      helperCopy={searchHelperCopy}
      isSearchBarVisible={true}
      onClearSearch={onClearSearch}
      onSearch={onSearch}
      onSearchInputBlur={onSearchInputBlur}
      onSearchQueryChange={onSearchQueryChange}
      onToggleSearchBar={onSearchActionPress}
      onSelectRecentSearchTerm={onSelectRecentSearchTerm}
      placeholderCopy={searchContextCopy.placeholder}
      recentSearchTerms={recentSearchTerms}
      searchAccessibilityLabel="Search saved library"
      searchQuery={searchQuery}
      showInlineToggleButton={false}
    />
  ) : null;

  const filterPopover = isFilterPopoverVisible ? (
    <LibrarySearchFilterPopover
      availableTagFilters={availableTagFilters}
      currentFilesFolderName={currentFilesFolderName}
      entityFilter={entityFilter}
      filesSearchScope={filesSearchScope}
      filesSortDirection={filesSortDirection}
      filesSortMode={filesSortMode}
      loopsSortState={loopsSortState}
      onSelectEntityFilter={onSelectEntityFilter}
      onSelectFilesSearchScope={onSelectFilesSearchScope}
      onSelectFilesSortMode={onSelectFilesSortMode}
      onSelectLoopsSortField={onSelectLoopsSortField}
      onSelectPlaylistsSortField={onSelectPlaylistsSortField}
      onSelectSourcesSortField={onSelectSourcesSortField}
      onSelectTagsSortField={onSelectTagsSortField}
      onToggleFilesSortDirection={onToggleFilesSortDirection}
      onToggleLoopsSortDirection={onToggleLoopsSortDirection}
      onTogglePlaylistsSortDirection={onTogglePlaylistsSortDirection}
      onToggleSourcesSortDirection={onToggleSourcesSortDirection}
      onToggleTagFilter={onToggleTagFilter}
      onToggleTagFilterMatchMode={onToggleTagFilterMatchMode}
      onToggleTagsSortDirection={onToggleTagsSortDirection}
      playlistsSortState={playlistsSortState}
      selectedTagFilters={selectedTagFilters}
      selectedView={selectedView}
      sourcesSortState={sourcesSortState}
      tagFilterMatchMode={tagFilterMatchMode}
      tagsSortState={tagsSortState}
    />
  ) : null;

  const activeFiltersLabel = hasActiveFilters
    ? resolveActiveFiltersSummaryLabel(
        entityFilter,
        selectedTagFilters,
        tagFilterMatchMode,
      )
    : null;

  const activeFiltersChip = activeFiltersLabel ? (
    <InteractionChip
      accessibilityLabel={`Filters active: ${activeFiltersLabel}. Tap to edit filters.`}
      label={activeFiltersLabel}
      onPress={onFilterActionPress}
      style={styles.activeFiltersChip}
      variant="selected"
    />
  ) : null;

  if (!searchPanel && !filterPopover && !activeFiltersChip) {
    return null;
  }

  return (
    <View style={styles.panelContent}>
      {activeFiltersChip}
      {filterPopover}
      {searchPanel}
    </View>
  );
};

const styles = StyleSheet.create({
  activeFiltersChip: {
    alignSelf: 'flex-start',
  },
  panelContent: {
    gap: 12,
  },
});
