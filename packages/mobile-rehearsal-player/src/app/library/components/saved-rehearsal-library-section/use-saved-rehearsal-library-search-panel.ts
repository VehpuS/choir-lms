import { useState } from 'react';

import {
  DEFAULT_LIBRARY_SEARCH_CONTROLS_VISIBILITY,
  toggleLibraryFilterVisibility,
  toggleLibrarySearchVisibility,
} from '../../search/components/library-search-controls-visibility';
import { useSavedRehearsalLibrarySearch } from './use-saved-rehearsal-library-search';

type UseSavedRehearsalLibrarySearchPanelOptions = {
  searchState: ReturnType<typeof useSavedRehearsalLibrarySearch>;
};

export const useSavedRehearsalLibrarySearchPanel = ({
  searchState,
}: UseSavedRehearsalLibrarySearchPanelOptions) => {
  const [searchPanelVisibility, setSearchPanelVisibility] = useState(
    DEFAULT_LIBRARY_SEARCH_CONTROLS_VISIBILITY,
  );
  const isSearchPanelVisible = searchPanelVisibility.isSearchBarVisible;

  const handleFilterActionPress = () => {
    setSearchPanelVisibility(
      toggleLibraryFilterVisibility(searchPanelVisibility),
    );
  };

  const handleSearchActionPress = () => {
    const nextSearchPanelVisibility = toggleLibrarySearchVisibility(
      searchPanelVisibility,
    );

    setSearchPanelVisibility(nextSearchPanelVisibility);

    if (
      !isSearchPanelVisible &&
      nextSearchPanelVisibility.isSearchBarVisible &&
      searchState.librarySearchQuery.trim().length > 0
    ) {
      searchState.submitLibrarySearch();
    }

    if (isSearchPanelVisible && !nextSearchPanelVisibility.isSearchBarVisible) {
      searchState.deactivateLibrarySearch();
    }
  };

  return {
    handleFilterActionPress,
    handleSearchActionPress,
    isSearchPanelVisible,
    searchPanelVisibility,
  };
};
