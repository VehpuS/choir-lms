import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BUILT_IN_SEARCH_SOURCES,
  sanitizeSearchSources,
  type SearchSource,
  type SearchSourceKind,
} from '@org/audio-library-models';

type SearchSourcesStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

export type SearchSourcesState = Record<SearchSourceKind, SearchSource[]>;

export const SEARCH_SOURCES_KEYS: Record<SearchSourceKind, string> = {
  lyrics: 'choirlms.search-sources.lyrics',
  'sheet-music': 'choirlms.search-sources.sheet-music',
};

export const createDefaultSearchSources = (): SearchSourcesState => ({
  lyrics: [...BUILT_IN_SEARCH_SOURCES.lyrics],
  'sheet-music': [...BUILT_IN_SEARCH_SOURCES['sheet-music']],
});

const parse = (stored: string | null): unknown => {
  if (stored === null) {
    return [];
  }

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

/** Reads both lists; anything missing or damaged becomes the built-ins. */
export const restoreSearchSources = async (
  storage: SearchSourcesStorage = AsyncStorage,
): Promise<SearchSourcesState> => {
  try {
    const [lyrics, sheetMusic] = await Promise.all([
      storage.getItem(SEARCH_SOURCES_KEYS.lyrics),
      storage.getItem(SEARCH_SOURCES_KEYS['sheet-music']),
    ]);

    return {
      lyrics: sanitizeSearchSources(parse(lyrics), 'lyrics'),
      'sheet-music': sanitizeSearchSources(parse(sheetMusic), 'sheet-music'),
    };
  } catch {
    return createDefaultSearchSources();
  }
};

export const persistSearchSources = async (
  kind: SearchSourceKind,
  sources: readonly SearchSource[],
  storage: SearchSourcesStorage = AsyncStorage,
): Promise<void> => {
  try {
    await storage.setItem(SEARCH_SOURCES_KEYS[kind], JSON.stringify(sources));
  } catch {
    // The choice still applies for this session.
  }
};
