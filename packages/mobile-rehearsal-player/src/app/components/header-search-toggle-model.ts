type ResolveHeaderSearchToggleOutcomeOptions = {
  isSearchBarVisible: boolean;
  searchQuery: string;
};

export type HeaderSearchToggleOutcome = {
  nextIsSearchBarVisible: boolean;
  shouldDeactivateSearch: boolean;
  shouldSubmitSearch: boolean;
};

export const resolveHeaderSearchToggleOutcome = ({
  isSearchBarVisible,
  searchQuery,
}: ResolveHeaderSearchToggleOutcomeOptions): HeaderSearchToggleOutcome => {
  const nextIsSearchBarVisible = !isSearchBarVisible;
  const hasSearchQuery = searchQuery.trim().length > 0;

  return {
    nextIsSearchBarVisible,
    shouldDeactivateSearch: isSearchBarVisible && !nextIsSearchBarVisible,
    shouldSubmitSearch:
      !isSearchBarVisible && nextIsSearchBarVisible && hasSearchQuery,
  };
};
