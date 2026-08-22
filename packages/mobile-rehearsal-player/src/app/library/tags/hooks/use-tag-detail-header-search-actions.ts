import { useCallback, useEffect, useRef } from 'react';

export type TagDetailHeaderSearchActions = {
  canShowFilters: boolean;
  closeSearchAccessibilityLabel: string;
  hasActiveFilters: boolean;
  hideFiltersAccessibilityLabel: string;
  isFilterPopoverVisible: boolean;
  isSearchBarVisible: boolean;
  onFilterActionPress: () => void;
  onSearchActionPress: () => void;
  searchAccessibilityLabel: string;
  showFiltersAccessibilityLabel: string;
};

const TAG_DETAIL_CLOSE_SEARCH_ACCESSIBILITY_LABEL = 'Close search';
const TAG_DETAIL_HIDE_FILTERS_ACCESSIBILITY_LABEL =
  'Hide sort and filter controls';
const TAG_DETAIL_SEARCH_ACCESSIBILITY_LABEL = "Search this tag's matches";
const TAG_DETAIL_SHOW_FILTERS_ACCESSIBILITY_LABEL =
  'Show sort and filter controls';

type UseTagDetailHeaderSearchActionsOptions = {
  hasActiveFilters: boolean;
  isFilterPopoverVisible: boolean;
  isSearchBarVisible: boolean;
  onDetailSearchActionsChange?: (
    actions: TagDetailHeaderSearchActions | null,
  ) => void;
  onToggleFilterPopover: () => void;
  onToggleSearchBar: () => void;
};

export const useTagDetailHeaderSearchActions = ({
  hasActiveFilters,
  isFilterPopoverVisible,
  isSearchBarVisible,
  onDetailSearchActionsChange,
  onToggleFilterPopover,
  onToggleSearchBar,
}: UseTagDetailHeaderSearchActionsOptions) => {
  const onToggleFilterPopoverRef = useRef(onToggleFilterPopover);
  onToggleFilterPopoverRef.current = onToggleFilterPopover;
  const onToggleSearchBarRef = useRef(onToggleSearchBar);
  onToggleSearchBarRef.current = onToggleSearchBar;
  const handleFilterActionPress = useCallback(() => {
    onToggleFilterPopoverRef.current();
  }, []);
  const handleSearchActionPress = useCallback(() => {
    onToggleSearchBarRef.current();
  }, []);

  useEffect(() => {
    if (!onDetailSearchActionsChange) {
      return;
    }

    onDetailSearchActionsChange({
      canShowFilters: true,
      closeSearchAccessibilityLabel: TAG_DETAIL_CLOSE_SEARCH_ACCESSIBILITY_LABEL,
      hasActiveFilters,
      hideFiltersAccessibilityLabel: TAG_DETAIL_HIDE_FILTERS_ACCESSIBILITY_LABEL,
      isFilterPopoverVisible,
      isSearchBarVisible,
      onFilterActionPress: handleFilterActionPress,
      onSearchActionPress: handleSearchActionPress,
      searchAccessibilityLabel: TAG_DETAIL_SEARCH_ACCESSIBILITY_LABEL,
      showFiltersAccessibilityLabel: TAG_DETAIL_SHOW_FILTERS_ACCESSIBILITY_LABEL,
    });

    return () => {
      onDetailSearchActionsChange(null);
    };
  }, [
    handleFilterActionPress,
    handleSearchActionPress,
    hasActiveFilters,
    isFilterPopoverVisible,
    isSearchBarVisible,
    onDetailSearchActionsChange,
  ]);
};
