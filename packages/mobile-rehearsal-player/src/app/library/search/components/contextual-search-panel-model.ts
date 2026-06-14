type ShouldShowRecentSearchSuggestionsOptions = {
  canShowRecentSearchTerms: boolean;
  recentSearchTerms: string[];
  searchQuery: string;
};

export const shouldShowRecentSearchSuggestions = (
  options: ShouldShowRecentSearchSuggestionsOptions,
) => {
  return (
    options.canShowRecentSearchTerms &&
    options.searchQuery.trim().length === 0 &&
    options.recentSearchTerms.length > 0
  );
};
