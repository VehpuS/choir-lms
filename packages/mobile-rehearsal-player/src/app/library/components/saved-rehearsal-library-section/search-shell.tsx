import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { DriveLibrarySectionHeader } from '../../drive/components/drive-library-section-header';
import {
  SAVED_REHEARSAL_LIBRARY_VIEW_OPTIONS,
  resolveSavedRehearsalLibraryViewCopy,
  type SavedRehearsalLibraryView,
} from '../../saved-rehearsal-library/detail-mode';
import {
  LibrarySearchControls,
  LibrarySearchControlsActions,
} from '../../search/components/library-search-controls';
import { InteractionChip } from '../interaction-chip';
import { useSavedRehearsalLibrarySearch } from './use-saved-rehearsal-library-search';

type SearchPanelVisibility = {
  isFilterPopoverVisible: boolean;
  isSearchBarVisible: boolean;
};

type SavedRehearsalLibrarySearchShellProps = {
  handleFilterActionPress: () => void;
  handleSearchActionPress: () => void;
  onSelectView: (view: SavedRehearsalLibraryView) => void;
  searchPanelVisibility: SearchPanelVisibility;
  searchState: ReturnType<typeof useSavedRehearsalLibrarySearch>;
  selectedView: SavedRehearsalLibraryView;
};

const SavedRehearsalLibraryViewSwitcher = ({
  onSelectView,
  selectedView,
}: Pick<
  SavedRehearsalLibrarySearchShellProps,
  'onSelectView' | 'selectedView'
>) => {
  return (
    <View style={styles.viewRow}>
      {SAVED_REHEARSAL_LIBRARY_VIEW_OPTIONS.map((option) => {
        return (
          <InteractionChip
            key={option.value}
            accessibilityLabel={`Show ${option.label} library view`}
            label={option.label}
            onPress={() => {
              onSelectView(option.value);
            }}
            style={styles.viewChip}
            variant={selectedView === option.value ? 'selected' : 'passive'}
          />
        );
      })}
    </View>
  );
};

export const SavedRehearsalLibrarySearchShell = ({
  handleFilterActionPress,
  handleSearchActionPress,
  onSelectView,
  searchPanelVisibility,
  searchState,
  selectedView,
}: SavedRehearsalLibrarySearchShellProps) => {
  const viewCopy = resolveSavedRehearsalLibraryViewCopy(selectedView);

  return (
    <Fragment>
      <DriveLibrarySectionHeader
        body={viewCopy.body}
        canRefresh={false}
        eyebrow={viewCopy.eyebrow}
        isLoading={false}
        onRefresh={() => undefined}
        trailingAction={
          <LibrarySearchControlsActions
            availabilityFilter={searchState.availabilityFilter}
            entityFilter={searchState.entityFilter}
            isFilterPopoverVisible={
              searchPanelVisibility.isFilterPopoverVisible
            }
            isSearchBarVisible={searchPanelVisibility.isSearchBarVisible}
            onFilterActionPress={handleFilterActionPress}
            onSearchActionPress={handleSearchActionPress}
            selectedTagFilters={searchState.selectedTagFilters}
          />
        }
        title={viewCopy.title}
      />
      <SavedRehearsalLibraryViewSwitcher
        onSelectView={onSelectView}
        selectedView={selectedView}
      />
      <LibrarySearchControls
        availableTagFilters={searchState.availableTagFilters}
        availabilityFilter={searchState.availabilityFilter}
        entityFilter={searchState.entityFilter}
        isFilterPopoverVisible={searchPanelVisibility.isFilterPopoverVisible}
        isSearchBarVisible={searchPanelVisibility.isSearchBarVisible}
        onClearSearch={searchState.clearLibrarySearch}
        onFilterActionPress={handleFilterActionPress}
        onSearch={searchState.submitLibrarySearch}
        onSearchActionPress={handleSearchActionPress}
        onSearchQueryChange={searchState.handleLibrarySearchQueryChange}
        onSelectAvailabilityFilter={searchState.setAvailabilityFilter}
        onSelectEntityFilter={searchState.setEntityFilter}
        onSelectRecentSearchTerm={searchState.runLibrarySearch}
        onToggleTagFilter={searchState.toggleTagFilter}
        recentSearchTerms={searchState.recentLibrarySearchTerms}
        selectedTagFilters={searchState.selectedTagFilters}
        searchQuery={searchState.librarySearchQuery}
      />
    </Fragment>
  );
};

const styles = StyleSheet.create({
  viewChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
