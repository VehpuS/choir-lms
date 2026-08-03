import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ContextualSearchPanel } from '../../search/components/contextual-search-panel';

type DriveLibrarySearchPanelProps = {
  canSearch: boolean;
  helperCopy: string;
  isSearchBarVisible?: boolean;
  isLoading: boolean;
  onClearSearch: () => void;
  onSearch: () => void;
  onSearchInputBlur: () => void;
  onSearchQueryChange: (value: string) => void;
  onToggleSearchBar?: () => void;
  onSelectRecentSearchTerm: (value: string) => void;
  placeholderCopy: string;
  recentSearchTerms: string[];
  searchQuery: string;
  showInlineToggleButton?: boolean;
};

export const DriveLibrarySearchPanel = ({
  canSearch,
  helperCopy,
  isSearchBarVisible,
  isLoading,
  onClearSearch,
  onSearch,
  onSearchInputBlur,
  onSearchQueryChange,
  onToggleSearchBar,
  onSelectRecentSearchTerm,
  placeholderCopy,
  recentSearchTerms,
  searchQuery,
  showInlineToggleButton = true,
}: DriveLibrarySearchPanelProps) => {
  const [isLocalSearchBarVisible, setIsLocalSearchBarVisible] = useState(false);
  const isSubmitDisabled = !canSearch || isLoading;
  const resolvedIsSearchBarVisible =
    isSearchBarVisible ?? isLocalSearchBarVisible;

  const handleToggleSearchBar = () => {
    if (onToggleSearchBar) {
      onToggleSearchBar();
      return;
    }

    setIsLocalSearchBarVisible((currentValue) => !currentValue);
  };

  const searchPanel = (
    <ContextualSearchPanel
      canShowRecentSearchTerms={canSearch && !isLoading}
      clearActionLabel="Browse folders"
      helperCopy={helperCopy}
      isSearchBarVisible={resolvedIsSearchBarVisible}
      isSubmitDisabled={isSubmitDisabled}
      onClearSearch={onClearSearch}
      onSearch={onSearch}
      onSearchInputBlur={onSearchInputBlur}
      onSearchQueryChange={onSearchQueryChange}
      onToggleSearchBar={handleToggleSearchBar}
      onSelectRecentSearchTerm={onSelectRecentSearchTerm}
      placeholderCopy={placeholderCopy}
      recentSearchTerms={recentSearchTerms}
      searchAccessibilityLabel="Search Google Drive"
      searchQuery={searchQuery}
      showInlineToggleButton={showInlineToggleButton}
    />
  );

  if (resolvedIsSearchBarVisible) {
    return searchPanel;
  }

  return <View style={styles.collapsedDock}>{searchPanel}</View>;
};

const styles = StyleSheet.create({
  collapsedDock: {
    height: 0,
    alignItems: 'flex-end',
  },
});
