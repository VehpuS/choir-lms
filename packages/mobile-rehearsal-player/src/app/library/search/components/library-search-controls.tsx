import { StyleSheet, Text, View } from 'react-native';

import { SurfaceIconButton } from '../../../components/surface-icon-button';
import {
  SAVED_SOURCE_SORT_FIELD_OPTIONS,
  type SavedSourceSortField,
  type SavedSourceSortState,
} from '../../components/saved-rehearsal-library-section/browse-source-group-model';
import { InteractionChip } from '../../components/interaction-chip';
import { SortFieldChipRow } from '../../components/sort-field-chip-row';
import { getLibrarySearchContextCopy } from '../../drive/utils/drive-library-view-model';
import {
  SAVED_LOOP_SORT_FIELD_OPTIONS,
  type SavedLoopSortField,
  type SavedLoopSortState,
} from '../../loops/utils/saved-loop-sort-model';
import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';
import type {
  LibraryFilesSearchScope,
  LibraryFilesSortDirection,
  LibraryFilesSortMode,
} from '../../saved-rehearsal-library/library-files-model';
import {
  SAVED_TAGS_LIST_SORT_FIELD_OPTIONS,
  getSavedTagsListSortDirectionToggleLabel,
  type SavedTagsListSortField,
  type SavedTagsListSortState,
} from '../../tags/components/saved-tags-list/model';
import type { LibrarySearchEntityFilter } from '../utils/saved-library-search-view-model';
import { ContextualSearchPanel } from './contextual-search-panel';
import type { LibrarySearchControlsVisibility } from './library-search-controls-visibility';
import {
  buildFilesSearchScopeOptions,
  ENTITY_FILTER_OPTIONS,
  FILES_SORT_OPTIONS,
  FilterChipGroup,
} from './library-search-filter-groups';

export { LibrarySearchControlsActions } from './library-search-controls-actions';

const FILTER_POPOVER_MAX_WIDTH = 360;

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
  onSelectRecentSearchTerm: (value: string) => void;
  onSelectSourcesSortField: (value: SavedSourceSortField) => void;
  onSelectTagsSortField: (value: SavedTagsListSortField) => void;
  onToggleFilesSortDirection: () => void;
  onToggleLoopsSortDirection: () => void;
  onToggleSourcesSortDirection: () => void;
  onToggleTagFilter: (value: string) => void;
  onToggleTagsSortDirection: () => void;
  loopsSortState: SavedLoopSortState;
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
  onSelectRecentSearchTerm,
  onSelectSourcesSortField,
  onSelectTagsSortField,
  onToggleFilesSortDirection,
  onToggleLoopsSortDirection,
  onToggleSourcesSortDirection,
  onToggleTagFilter,
  onToggleTagsSortDirection,
  loopsSortState,
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
    <View style={styles.filterPopover}>
      {selectedView === 'files' ? (
        <>
          <FilterChipGroup
            filterChipStyle={styles.filterChip}
            filterGroupStyle={styles.filterGroup}
            filterLabelStyle={styles.filterLabel}
            filterRowStyle={styles.filterRow}
            label="Scope"
            onSelectValue={onSelectFilesSearchScope}
            options={buildFilesSearchScopeOptions(currentFilesFolderName)}
            selectedValue={filesSearchScope}
          />
          <FilterChipGroup
            filterChipStyle={styles.filterChip}
            filterGroupStyle={styles.filterGroup}
            filterLabelRowStyle={styles.filterLabelRow}
            filterLabelStyle={styles.filterLabel}
            filterRowStyle={styles.filterRow}
            label="Sort"
            onSelectValue={onSelectFilesSortMode}
            options={FILES_SORT_OPTIONS}
            selectedValue={filesSortMode}
            trailingAction={
              <SurfaceIconButton
                accessibilityLabel={getSavedTagsListSortDirectionToggleLabel(
                  filesSortDirection,
                )}
                icon={
                  filesSortDirection === 'asc'
                    ? 'sort-ascending'
                    : 'sort-descending'
                }
                onPress={onToggleFilesSortDirection}
                size={16}
                style={styles.sortDirectionToggle}
              />
            }
          />
          <FilterChipGroup
            filterChipStyle={styles.filterChip}
            filterGroupStyle={styles.filterGroup}
            filterLabelStyle={styles.filterLabel}
            filterRowStyle={styles.filterRow}
            label="Show"
            onSelectValue={onSelectEntityFilter}
            options={ENTITY_FILTER_OPTIONS}
            selectedValue={entityFilter}
          />
        </>
      ) : null}
      {selectedView === 'tracks' ? (
        <SortFieldChipRow
          direction={sourcesSortState.direction}
          directionToggleAccessibilityLabel={getSavedTagsListSortDirectionToggleLabel(
            sourcesSortState.direction,
          )}
          fieldOptions={SAVED_SOURCE_SORT_FIELD_OPTIONS}
          onSelectField={onSelectSourcesSortField}
          onToggleDirection={onToggleSourcesSortDirection}
          selectedField={sourcesSortState.field}
        />
      ) : null}
      {selectedView === 'loops' ? (
        <SortFieldChipRow
          direction={loopsSortState.direction}
          directionToggleAccessibilityLabel={getSavedTagsListSortDirectionToggleLabel(
            loopsSortState.direction,
          )}
          fieldOptions={SAVED_LOOP_SORT_FIELD_OPTIONS}
          onSelectField={onSelectLoopsSortField}
          onToggleDirection={onToggleLoopsSortDirection}
          selectedField={loopsSortState.field}
        />
      ) : null}
      {selectedView === 'tags' ? (
        <SortFieldChipRow
          direction={tagsSortState.direction}
          directionToggleAccessibilityLabel={getSavedTagsListSortDirectionToggleLabel(
            tagsSortState.direction,
          )}
          fieldOptions={SAVED_TAGS_LIST_SORT_FIELD_OPTIONS}
          onSelectField={onSelectTagsSortField}
          onToggleDirection={onToggleTagsSortDirection}
          selectedField={tagsSortState.field}
        />
      ) : null}
      {availableTagFilters.length > 0 ? (
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Tags</Text>
          <View style={styles.filterRow}>
            {availableTagFilters.map((tagFilter) => {
              return (
                <InteractionChip
                  key={tagFilter}
                  label={tagFilter}
                  onPress={() => {
                    onToggleTagFilter(tagFilter);
                  }}
                  style={styles.filterChip}
                  variant={
                    selectedTagFilters.includes(tagFilter)
                      ? 'selected'
                      : 'passive'
                  }
                />
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
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
  filterPopover: {
    alignSelf: 'flex-end',
    width: '100%',
    maxWidth: FILTER_POPOVER_MAX_WIDTH,
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 20,
    backgroundColor: '#fffcf4',
    shadowColor: '#173229',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  filterGroup: { gap: 8 },
  filterLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterLabel: {
    color: '#5f5647',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { minHeight: 32, paddingHorizontal: 12, paddingVertical: 6 },
  sortDirectionToggle: { width: 32, height: 32 },
});
