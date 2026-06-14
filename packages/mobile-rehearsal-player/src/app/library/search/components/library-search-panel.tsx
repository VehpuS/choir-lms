import { getLibrarySearchContextCopy } from '../../drive/utils/drive-library-view-model';
import { ContextualSearchPanel } from './contextual-search-panel';

type LibrarySearchPanelProps = {
  isSearchMode: boolean;
  onClearSearch: () => void;
  onSearch: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectRecentSearchTerm: (value: string) => void;
  recentSearchTerms: string[];
  searchQuery: string;
};

export const LibrarySearchPanel = ({
  isSearchMode,
  onClearSearch,
  onSearch,
  onSearchQueryChange,
  onSelectRecentSearchTerm,
  recentSearchTerms,
  searchQuery,
}: LibrarySearchPanelProps) => {
  const searchContextCopy = getLibrarySearchContextCopy();

  return (
    <ContextualSearchPanel
      clearActionLabel="Show all saved items"
      helperCopy={searchContextCopy.helper}
      isSearchMode={isSearchMode}
      onClearSearch={onClearSearch}
      onSearch={onSearch}
      onSearchQueryChange={onSearchQueryChange}
      onSelectRecentSearchTerm={onSelectRecentSearchTerm}
      placeholderCopy={searchContextCopy.placeholder}
      recentSearchTerms={recentSearchTerms}
      searchAccessibilityLabel="Search saved library"
      searchQuery={searchQuery}
    />
  );
};
