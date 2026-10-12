const FILE_EXTENSION_PATTERN = /\.[a-z0-9]{2,5}$/i;
const LEADING_TRACK_NUMBER_PATTERN = /^\s*\d{1,3}\s*[-._)]\s*/;
const SEPARATOR_PATTERN = /[_–—]+/g;
const REPEATED_WHITESPACE_PATTERN = /\s+/g;
const WEB_SEARCH_BASE_URL = 'https://www.google.com/search';

/**
 * Turns a saved track's file name into a lookup-friendly title: no extension,
 * no leading track number (only when followed by a separator, so
 * "99 Luftballons" survives), and `_` read as a space. The artist is left for the
 * user to type because tracks carry no artist metadata.
 */
export const suggestLyricsTitle = (trackName: string): string => {
  return trackName
    .trim()
    .replace(FILE_EXTENSION_PATTERN, '')
    .replace(LEADING_TRACK_NUMBER_PATTERN, '')
    .replace(SEPARATOR_PATTERN, ' ')
    .replace(REPEATED_WHITESPACE_PATTERN, ' ')
    .trim();
};

/** The web search for the Title and Artist visible in the lyrics editor. */
export const buildLyricsWebSearchUrl = (query: {
  artist: string;
  title: string;
}): string => {
  const terms = [query.title, query.artist, 'lyrics']
    .map((term) => term.trim().replace(REPEATED_WHITESPACE_PATTERN, ' '))
    .filter((term) => term.length > 0)
    .join(' ');

  return `${WEB_SEARCH_BASE_URL}?q=${encodeURIComponent(terms)}`;
};
