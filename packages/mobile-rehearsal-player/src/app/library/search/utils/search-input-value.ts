import { normalizeRecentSearchTerm } from './search-history';

type ResolveSearchInputValueOptions = {
  currentInputValue: string;
  query: string;
  syncInputValue: boolean;
};

export const resolveSearchInputValue = (
  options: ResolveSearchInputValueOptions,
) => {
  if (!options.syncInputValue) {
    return options.currentInputValue;
  }

  return normalizeRecentSearchTerm(options.query) ?? '';
};
