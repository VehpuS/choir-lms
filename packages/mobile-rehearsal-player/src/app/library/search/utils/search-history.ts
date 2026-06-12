export const MAX_RECENT_SEARCH_TERMS = 5;

export const normalizeRecentSearchTerm = (value: string) => {
  const nextValue = value.trim();

  return nextValue.length > 0 ? nextValue : null;
};

export const recordRecentSearchTerm = (
  recentSearchTerms: string[],
  value: string,
) => {
  const nextSearchTerm = normalizeRecentSearchTerm(value);

  if (!nextSearchTerm) {
    return recentSearchTerms;
  }

  const normalizedNextSearchTerm = nextSearchTerm.toLocaleLowerCase();

  return [
    nextSearchTerm,
    ...recentSearchTerms.filter((searchTerm) => {
      return searchTerm.toLocaleLowerCase() !== normalizedNextSearchTerm;
    }),
  ].slice(0, MAX_RECENT_SEARCH_TERMS);
};
