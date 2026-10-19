/**
 * Web searches the app opens in the system browser: where to look for a score
 * or for lyrics. A source is a label and an address template; the app never
 * fetches from it (the user brings a link or a file back).
 */
export type SearchSourceKind = 'sheet-music' | 'lyrics';

export type SearchSource = {
  id: string;
  label: string;
  urlTemplate: string;
};

export type SearchQuery = { artist: string; title: string };

export const MAX_SEARCH_SOURCES = 8;
export const MAX_SEARCH_LABEL_LENGTH = 30;
export const MAX_SEARCH_TEMPLATE_LENGTH = 300;

/** `{query}` is the title and artist together; the others are each alone. */
export const SEARCH_TEMPLATE_PLACEHOLDERS = [
  '{query}',
  '{title}',
  '{artist}',
] as const;

// Each address was opened in a browser and returned a results page
// (2026-10-19). IMSLP's own search needs a bot check, so it is reached through
// a web search limited to its site.
const GOOGLE_SEARCH = 'https://www.google.com/search?q=';

export const BUILT_IN_SEARCH_SOURCES: Record<
  SearchSourceKind,
  readonly SearchSource[]
> = {
  lyrics: [
    {
      id: 'google',
      label: 'Google',
      urlTemplate: `${GOOGLE_SEARCH}{query}%20lyrics`,
    },
    {
      id: 'duckduckgo',
      label: 'DuckDuckGo',
      urlTemplate: 'https://duckduckgo.com/?q={query}%20lyrics',
    },
    {
      id: 'genius',
      label: 'Genius',
      urlTemplate: 'https://genius.com/search?q={query}',
    },
  ],
  'sheet-music': [
    {
      id: 'musescore',
      label: 'MuseScore',
      urlTemplate: 'https://musescore.com/sheetmusic?text={query}',
    },
    {
      id: 'imslp',
      label: 'IMSLP',
      urlTemplate: `${GOOGLE_SEARCH}{query}%20site%3Aimslp.org`,
    },
    {
      id: 'web-pdf',
      label: 'Web (PDF)',
      urlTemplate: `${GOOGLE_SEARCH}{query}%20sheet%20music%20filetype%3Apdf`,
    },
  ],
};

const REPEATED_WHITESPACE_PATTERN = /\s+/g;
const WHITESPACE_PATTERN = /\s/;
const HTTPS_HOST_PATTERN = /^https:\/\/[^/?#\s]+\.[^/?#\s]+/i;
const NON_ALPHANUMERIC_RUN_PATTERN = /[^a-z0-9]+/g;

export type SearchTemplateProblem =
  | 'invalid-address'
  | 'no-placeholder'
  | 'not-https'
  | 'too-long';

/** Why a template cannot be used, or undefined when it can. */
export const findSearchTemplateProblem = (
  template: string,
): SearchTemplateProblem | undefined => {
  const trimmed = template.trim();

  if (trimmed.length > MAX_SEARCH_TEMPLATE_LENGTH) {
    return 'too-long';
  }

  if (!trimmed.toLowerCase().startsWith('https://')) {
    return 'not-https';
  }

  if (WHITESPACE_PATTERN.test(trimmed) || !HTTPS_HOST_PATTERN.test(trimmed)) {
    return 'invalid-address';
  }

  return SEARCH_TEMPLATE_PLACEHOLDERS.some((token) => trimmed.includes(token))
    ? undefined
    : 'no-placeholder';
};

const clean = (term: string): string => {
  return term.trim().replace(REPEATED_WHITESPACE_PATTERN, ' ');
};

/** The address to open: the template filled with the encoded Title and Artist. */
export const buildSearchUrl = (
  source: Pick<SearchSource, 'urlTemplate'>,
  query: SearchQuery,
): string => {
  const title = clean(query.title);
  const artist = clean(query.artist);
  const both = [title, artist].filter((term) => term.length > 0).join(' ');

  return source.urlTemplate
    .replaceAll('{query}', encodeURIComponent(both))
    .replaceAll('{title}', encodeURIComponent(title))
    .replaceAll('{artist}', encodeURIComponent(artist));
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const toSource = (value: unknown): SearchSource | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const { id, label, urlTemplate } = value;

  if (
    typeof id !== 'string' ||
    typeof label !== 'string' ||
    typeof urlTemplate !== 'string'
  ) {
    return undefined;
  }

  const trimmedLabel = clean(label).slice(0, MAX_SEARCH_LABEL_LENGTH).trim();
  const template = urlTemplate.trim();

  if (
    id.trim().length === 0 ||
    trimmedLabel.length === 0 ||
    findSearchTemplateProblem(template) !== undefined
  ) {
    return undefined;
  }

  return { id: id.trim(), label: trimmedLabel, urlTemplate: template };
};

/**
 * Reads a stored list: drops anything malformed, repeated (by id or address),
 * or over the cap. An empty result becomes the built-ins, so a search is
 * always available.
 */
export const sanitizeSearchSources = (
  value: unknown,
  kind: SearchSourceKind,
): SearchSource[] => {
  const ids = new Set<string>();
  const templates = new Set<string>();
  const sources: SearchSource[] = [];

  for (const entry of Array.isArray(value) ? value : []) {
    const source = toSource(entry);

    if (
      !source ||
      ids.has(source.id) ||
      templates.has(source.urlTemplate) ||
      sources.length >= MAX_SEARCH_SOURCES
    ) {
      continue;
    }

    ids.add(source.id);
    templates.add(source.urlTemplate);
    sources.push(source);
  }

  return sources.length > 0 ? sources : [...BUILT_IN_SEARCH_SOURCES[kind]];
};

/** The built-ins a list does not hold, in their usual order. */
export const unusedBuiltInSearchSources = (
  kind: SearchSourceKind,
  list: readonly SearchSource[],
): SearchSource[] => {
  const used = new Set(list.map(({ id }) => id));

  return BUILT_IN_SEARCH_SOURCES[kind].filter(({ id }) => !used.has(id));
};

/** Adds a source last; a full list or a repeated address changes nothing. */
export const addSearchSource = (
  list: readonly SearchSource[],
  source: SearchSource,
): SearchSource[] => {
  if (
    list.length >= MAX_SEARCH_SOURCES ||
    list.some(
      (existing) =>
        existing.id === source.id ||
        existing.urlTemplate === source.urlTemplate,
    )
  ) {
    return [...list];
  }

  return [...list, source];
};

/** Removes a source, but never the last one. */
export const removeSearchSource = (
  list: readonly SearchSource[],
  id: string,
): SearchSource[] => {
  return list.length <= 1 ? [...list] : list.filter((entry) => entry.id !== id);
};

/** A custom source with an id that no listed source uses. */
export const createCustomSearchSource = (
  list: readonly SearchSource[],
  label: string,
  urlTemplate: string,
): SearchSource | undefined => {
  const trimmedLabel = clean(label).slice(0, MAX_SEARCH_LABEL_LENGTH).trim();
  const template = urlTemplate.trim();

  if (
    trimmedLabel.length === 0 ||
    findSearchTemplateProblem(template) !== undefined
  ) {
    return undefined;
  }

  const slug =
    trimmedLabel.toLowerCase().replace(NON_ALPHANUMERIC_RUN_PATTERN, '-') ||
    'source';
  const used = new Set(list.map(({ id }) => id));
  let id = `custom-${slug}`;

  for (let count = 2; used.has(id); count += 1) {
    id = `custom-${slug}-${count}`;
  }

  return { id, label: trimmedLabel, urlTemplate: template };
};
