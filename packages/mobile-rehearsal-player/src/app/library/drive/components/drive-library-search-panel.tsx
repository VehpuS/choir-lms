import { ContextualSearchPanel } from '../../search/components/contextual-search-panel';

type DriveLibrarySearchPanelProps = {
  canSearch: boolean;
  helperCopy: string;
  isLoading: boolean;
  isSearchMode: boolean;
  onClearSearch: () => void;
  onSearch: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectRecentSearchTerm: (value: string) => void;
  placeholderCopy: string;
  recentSearchTerms: string[];
  searchQuery: string;
};

export const DriveLibrarySearchPanel = ({
  canSearch,
  helperCopy,
  isLoading,
  isSearchMode,
  onClearSearch,
  onSearch,
  onSearchQueryChange,
  onSelectRecentSearchTerm,
  placeholderCopy,
  recentSearchTerms,
  searchQuery,
}: DriveLibrarySearchPanelProps) => {
  const isSubmitDisabled = !canSearch || isLoading;

  return (
    <ContextualSearchPanel
      canShowRecentSearchTerms={canSearch && !isLoading}
      clearActionLabel="Browse folders"
      helperCopy={helperCopy}
      isSearchMode={isSearchMode}
      isSubmitDisabled={isSubmitDisabled}
      onClearSearch={onClearSearch}
      onSearch={onSearch}
      onSearchQueryChange={onSearchQueryChange}
      onSelectRecentSearchTerm={onSelectRecentSearchTerm}
      placeholderCopy={placeholderCopy}
      recentSearchTerms={recentSearchTerms}
      searchAccessibilityLabel="Search Google Drive"
      searchQuery={searchQuery}
    />
  );
};
