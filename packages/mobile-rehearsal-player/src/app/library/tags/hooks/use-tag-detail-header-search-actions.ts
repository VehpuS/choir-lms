import { useCallback, useEffect, useRef } from 'react';

export type TagDetailHeaderSearchActions = {
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

type HeaderSearchLabels = Pick<
  TagDetailHeaderSearchActions,
  | 'closeSearchAccessibilityLabel'
  | 'hideFiltersAccessibilityLabel'
  | 'searchAccessibilityLabel'
  | 'showFiltersAccessibilityLabel'
>;

type UseTagDetailHeaderSearchActionsOptions = {
  hasActiveFilters: boolean;
  /** Accessibility labels for another view that registers its own header controls. */
  labels?: Partial<HeaderSearchLabels>;
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
  labels,
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
      closeSearchAccessibilityLabel:
        labels?.closeSearchAccessibilityLabel ??
        TAG_DETAIL_CLOSE_SEARCH_ACCESSIBILITY_LABEL,
      hasActiveFilters,
      hideFiltersAccessibilityLabel:
        labels?.hideFiltersAccessibilityLabel ??
        TAG_DETAIL_HIDE_FILTERS_ACCESSIBILITY_LABEL,
      isFilterPopoverVisible,
      isSearchBarVisible,
      onFilterActionPress: handleFilterActionPress,
      onSearchActionPress: handleSearchActionPress,
      searchAccessibilityLabel:
        labels?.searchAccessibilityLabel ??
        TAG_DETAIL_SEARCH_ACCESSIBILITY_LABEL,
      showFiltersAccessibilityLabel:
        labels?.showFiltersAccessibilityLabel ??
        TAG_DETAIL_SHOW_FILTERS_ACCESSIBILITY_LABEL,
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
    labels?.closeSearchAccessibilityLabel,
    labels?.hideFiltersAccessibilityLabel,
    labels?.searchAccessibilityLabel,
    labels?.showFiltersAccessibilityLabel,
    onDetailSearchActionsChange,
  ]);
};
