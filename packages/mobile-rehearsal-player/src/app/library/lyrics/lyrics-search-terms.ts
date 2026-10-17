const FILE_EXTENSION_PATTERN = /\.[a-z0-9]{2,5}$/i;
// A track number is dropped only when a separator or a second number follows
// it ("04_", "12 - ", "1-05 "), so "99 Luftballons" and "10cc" survive.
const LEADING_TRACK_NUMBER_PATTERN =
  /^\s*(?:\d{1,3}\s*[-._)]\s*\d{1,3}(?:\s*[-._)]\s*|\s+)|\d{1,3}\s*[-._)]\s*)/;
const SEPARATOR_PATTERN = /[_]+/g;
// "Artist - Title": a dash with spaces on both sides, so "Radio-Video" is not split.
const ARTIST_TITLE_SEPARATOR_PATTERN = /\s[-–—]\s/;
const REPEATED_WHITESPACE_PATTERN = /\s+/g;
const WEB_SEARCH_BASE_URL = 'https://www.google.com/search';

export type LyricsQuerySuggestion = { artist: string; title: string };

/**
 * Turns a saved track's file name into a lookup-friendly Title and Artist: no
 * extension, no leading track number, `_` read as a space, and an
 * `Artist - Title` name split at its first spaced dash. A name without that
 * dash gets an empty Artist, since tracks carry no artist metadata. Only the
 * first dash splits, so a title that itself contains " - " stays whole.
 */
export const suggestLyricsQuery = (
  trackName: string,
): LyricsQuerySuggestion => {
  const cleaned = trackName
    .trim()
    .replace(FILE_EXTENSION_PATTERN, '')
    .replace(LEADING_TRACK_NUMBER_PATTERN, '')
    .replace(SEPARATOR_PATTERN, ' ')
    .replace(REPEATED_WHITESPACE_PATTERN, ' ')
    .trim();
  const separator = ARTIST_TITLE_SEPARATOR_PATTERN.exec(cleaned);

  if (!separator) {
    return { artist: '', title: cleaned };
  }

  const artist = cleaned.slice(0, separator.index).trim();
  const title = cleaned.slice(separator.index + separator[0].length).trim();

  // A dash with nothing on one side is not an Artist - Title name.
  return artist && title ? { artist, title } : { artist: '', title: cleaned };
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
