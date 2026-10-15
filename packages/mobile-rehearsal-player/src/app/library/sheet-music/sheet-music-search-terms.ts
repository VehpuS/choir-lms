import { suggestLyricsTitle } from '../lyrics/lyrics-search-terms';

const REPEATED_WHITESPACE_PATTERN = /\s+/g;
// Spike 9.4: the search page form seen in MuseScore's own search results.
const MUSESCORE_SEARCH_BASE_URL = 'https://musescore.com/sheetmusic';

/** The Title shown in the add flow before the user edits it: the track name, cleaned. */
export const suggestSheetMusicTitle = suggestLyricsTitle;

/**
 * The MuseScore search for the Title and Artist visible in the add flow. The
 * app only opens this address in the system browser; it never fetches from
 * musescore.com (design Decision 10).
 */
export const buildMuseScoreSearchUrl = (query: {
  artist: string;
  title: string;
}): string => {
  const terms = [query.title, query.artist]
    .map((term) => term.trim().replace(REPEATED_WHITESPACE_PATTERN, ' '))
    .filter((term) => term.length > 0)
    .join(' ');

  return `${MUSESCORE_SEARCH_BASE_URL}?text=${encodeURIComponent(terms)}`;
};
