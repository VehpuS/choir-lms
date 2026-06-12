import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  MAX_RECENT_SEARCH_TERMS,
  normalizeRecentSearchTerm,
} from './search-history';

type SearchHistoryStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'removeItem' | 'setItem'
>;

export const ADD_RECENT_SEARCH_HISTORY_KEY = 'choirlms.search.add.recent';
export const LIBRARY_RECENT_SEARCH_HISTORY_KEY =
  'choirlms.search.library.recent';

const isDuplicateTerm = (terms: string[], value: string) => {
  const normalizedValue = value.toLocaleLowerCase();

  return terms.some((term) => {
    return term.toLocaleLowerCase() === normalizedValue;
  });
};

const normalizeStoredRecentSearchTerms = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  const normalizedTerms: string[] = [];

  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue;
    }

    const normalizedEntry = normalizeRecentSearchTerm(entry);

    if (!normalizedEntry || isDuplicateTerm(normalizedTerms, normalizedEntry)) {
      continue;
    }

    normalizedTerms.push(normalizedEntry);

    if (normalizedTerms.length >= MAX_RECENT_SEARCH_TERMS) {
      break;
    }
  }

  return normalizedTerms;
};

export const restoreRecentSearchHistory = async (
  key: string,
  storage: SearchHistoryStorage = AsyncStorage,
) => {
  const storedValue = await storage.getItem(key);

  if (!storedValue) {
    return [] as string[];
  }

  try {
    const parsedValue = JSON.parse(storedValue) as unknown;

    return normalizeStoredRecentSearchTerms(parsedValue);
  } catch {
    return [] as string[];
  }
};

export const persistRecentSearchHistory = async (
  key: string,
  recentSearchTerms: string[],
  storage: SearchHistoryStorage = AsyncStorage,
) => {
  if (recentSearchTerms.length === 0) {
    await storage.removeItem(key);
    return;
  }

  await storage.setItem(
    key,
    JSON.stringify(recentSearchTerms.slice(0, MAX_RECENT_SEARCH_TERMS)),
  );
};
