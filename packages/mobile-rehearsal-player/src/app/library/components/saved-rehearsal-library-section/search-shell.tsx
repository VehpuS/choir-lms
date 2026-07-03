import { Fragment } from 'react';

import { DriveLibrarySectionHeader } from '../../drive/components/drive-library-section-header';
import {
  LibrarySearchControls,
  LibrarySearchControlsActions,
} from '../../search/components/library-search-controls';
import { useSavedRehearsalLibrarySearch } from './use-saved-rehearsal-library-search';

type SearchPanelVisibility = {
  isFilterPopoverVisible: boolean;
  isSearchBarVisible: boolean;
};

type SavedRehearsalLibrarySearchShellProps = {
  handleFilterActionPress: () => void;
  handleSearchActionPress: () => void;
  searchPanelVisibility: SearchPanelVisibility;
  searchState: ReturnType<typeof useSavedRehearsalLibrarySearch>;
};

export const SavedRehearsalLibrarySearchShell = ({
  handleFilterActionPress,
  handleSearchActionPress,
  searchPanelVisibility,
  searchState,
}: SavedRehearsalLibrarySearchShellProps) => {
  return (
    <Fragment>
      <DriveLibrarySectionHeader
        canRefresh={false}
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
          />
        }
        title="Saved tracks"
      />
      <LibrarySearchControls
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
        recentSearchTerms={searchState.recentLibrarySearchTerms}
        searchQuery={searchState.librarySearchQuery}
      />
    </Fragment>
  );
};
