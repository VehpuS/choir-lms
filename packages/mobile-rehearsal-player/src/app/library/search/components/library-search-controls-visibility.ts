export type LibrarySearchControlsVisibility = {
  isFilterPopoverVisible: boolean;
  isSearchBarVisible: boolean;
};

export const DEFAULT_LIBRARY_SEARCH_CONTROLS_VISIBILITY: LibrarySearchControlsVisibility =
  {
    isFilterPopoverVisible: false,
    isSearchBarVisible: false,
  };

export const toggleLibrarySearchVisibility = (
  visibility: LibrarySearchControlsVisibility,
): LibrarySearchControlsVisibility => {
  return {
    ...visibility,
    isSearchBarVisible: !visibility.isSearchBarVisible,
  };
};

export const toggleLibraryFilterVisibility = (
  visibility: LibrarySearchControlsVisibility,
): LibrarySearchControlsVisibility => {
  return {
    ...visibility,
    isFilterPopoverVisible: !visibility.isFilterPopoverVisible,
  };
};
