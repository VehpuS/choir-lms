export type LibrarySearchPanelVisibility = {
  isFilterPopoverVisible: boolean;
  isSearchBarVisible: boolean;
};

export const DEFAULT_LIBRARY_SEARCH_PANEL_VISIBILITY: LibrarySearchPanelVisibility =
  {
    isFilterPopoverVisible: false,
    isSearchBarVisible: false,
  };

export const resolveLibrarySearchActionVisibility = (
  visibility: LibrarySearchPanelVisibility,
): LibrarySearchPanelVisibility => {
  return {
    ...visibility,
    isSearchBarVisible: !visibility.isSearchBarVisible,
  };
};

export const toggleLibraryFilterPopoverVisibility = (
  visibility: LibrarySearchPanelVisibility,
): LibrarySearchPanelVisibility => {
  return {
    ...visibility,
    isFilterPopoverVisible: !visibility.isFilterPopoverVisible,
  };
};