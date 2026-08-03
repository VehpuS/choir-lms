type ShouldShowRecentSearchSuggestionsOptions = {
  canShowRecentSearchTerms: boolean;
  recentSearchTerms: string[];
  searchQuery: string;
};

type ResolveSearchInputBlurOutcomeOptions = {
  shouldSkipBlurCommit: boolean;
};

export const resolveSearchInputBlurOutcome = (
  options: ResolveSearchInputBlurOutcomeOptions,
) => {
  return {
    nextShouldSkipBlurCommit: false,
    shouldCommitRecentSearch: !options.shouldSkipBlurCommit,
  };
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
