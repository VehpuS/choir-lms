import { StyleSheet, View } from 'react-native';

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
import type { LibrarySearchEntityFilter } from '../utils/saved-library-search-view-model';
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
  onToggleTagsSortDirection: () => void;
  loopsSortState: SavedLoopSortState;
  playlistsSortState: SavedPlaylistSortState;
  recentSearchTerms: string[];
  selectedView: SavedRehearsalLibraryView;
  selectedTagFilters: string[];
  searchQuery: string;
  sourcesSortState: SavedSourceSortState;
  tagsSortState: SavedTagsListSortState;
};

export const LibrarySearchControls = ({
  availableTagFilters,
  currentFilesFolderName,
  entityFilter,
  filesSearchScope,
  filesSortDirection,
  filesSortMode,
  isFilterPopoverVisible,
  isSearchBarVisible,
  onClearSearch,
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
  onToggleTagsSortDirection,
  loopsSortState,
  playlistsSortState,
  recentSearchTerms,
  selectedView,
  selectedTagFilters,
  searchQuery,
  sourcesSortState,
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
      onToggleTagsSortDirection={onToggleTagsSortDirection}
      playlistsSortState={playlistsSortState}
      selectedTagFilters={selectedTagFilters}
      selectedView={selectedView}
      sourcesSortState={sourcesSortState}
      tagsSortState={tagsSortState}
    />
  ) : null;

  if (!searchPanel && !filterPopover) {
    return null;
  }

  return (
    <View style={styles.panelContent}>
      {filterPopover}
      {searchPanel}
    </View>
  );
};

const styles = StyleSheet.create({
  panelContent: {
    gap: 12,
  },
});
