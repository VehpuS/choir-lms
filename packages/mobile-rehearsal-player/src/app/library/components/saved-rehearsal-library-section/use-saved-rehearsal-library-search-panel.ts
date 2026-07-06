import { useState } from 'react';

import { resolveHeaderSearchToggleOutcome } from '../../../components/header-search-toggle-model';
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
    const toggleOutcome = resolveHeaderSearchToggleOutcome({
      isSearchBarVisible: isSearchPanelVisible,
      searchQuery: searchState.librarySearchQuery,
    });
    const nextSearchPanelVisibility = toggleLibrarySearchVisibility(
      searchPanelVisibility,
    );

    setSearchPanelVisibility(nextSearchPanelVisibility);

    if (toggleOutcome.shouldSubmitSearch) {
      searchState.submitLibrarySearch();
    }

    if (toggleOutcome.shouldDeactivateSearch) {
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
