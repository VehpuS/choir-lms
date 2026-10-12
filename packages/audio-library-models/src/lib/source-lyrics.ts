export const MAX_LYRICS_LENGTH = 20_000;

export type SourceLyricsOrigin = 'looked-up' | 'typed';

export type SourceLyrics = {
  text: string;
  updatedAt: string;
  origin: SourceLyricsOrigin;
};

const LINE_ENDING_PATTERN = /\r\n?/g;
const TRAILING_WHITESPACE_PATTERN = /[^\S\n]+$/gm;
const BLANK_LINE_RUN_PATTERN = /\n{3,}/g;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/**
 * Normalizes lyrics text at the boundary where it enters the library: unified
 * line endings, no trailing whitespace, and at most one blank line in a row.
 * Length is not enforced here; the editor refuses over-long text and the
 * storage parser truncates defensively.
 */
export const normalizeLyricsText = (text: string): string => {
  return text
    .replace(LINE_ENDING_PATTERN, '\n')
    .replace(TRAILING_WHITESPACE_PATTERN, '')
    .replace(BLANK_LINE_RUN_PATTERN, '\n\n')
    .trim();
};

export const isLyricsTextWithinLimit = (text: string): boolean => {
  return normalizeLyricsText(text).length <= MAX_LYRICS_LENGTH;
};

/**
 * Builds the stored lyrics value from editor text. An empty body returns
 * `undefined`, which callers use to remove the field.
 */
export const createSourceLyrics = (options: {
  origin: SourceLyricsOrigin;
  text: string;
  updatedAt: string;
}): SourceLyrics | undefined => {
  const text = normalizeLyricsText(options.text);

  if (text.length === 0) {
    return undefined;
  }

  return { text, updatedAt: options.updatedAt, origin: options.origin };
};

/**
 * Reads a stored `lyrics` value. A malformed value is dropped rather than
 * failing the read of the whole track.
 */
export const parseSourceLyrics = (value: unknown): SourceLyrics | undefined => {
  if (
    !isRecord(value) ||
    typeof value.text !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    (value.origin !== 'looked-up' && value.origin !== 'typed')
  ) {
    return undefined;
  }

  const text = normalizeLyricsText(value.text).slice(0, MAX_LYRICS_LENGTH);

  if (text.length === 0) {
    return undefined;
  }

  return { text, updatedAt: value.updatedAt, origin: value.origin };
};

type LyricsOwnerSource = {
  id: string;
  adjustment?: { sourceRef: string };
};

type LyricsOwnerItem = { id: string } & (
  | { sourceId: string; adjustment?: undefined }
  | { adjustment?: { sourceRef: string }; sourceId?: undefined }
);

/**
 * Finds the saved track that owns the lyrics shown for a track, an adjusted
 * track, a loop, or a loop of an adjusted track. Returns `null` when the
 * owning track no longer exists.
 */
export const resolveLyricsOwner = <Source extends LyricsOwnerSource>(
  item: LyricsOwnerItem,
  sources: readonly Source[],
): Source | null => {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const start = item.sourceId ?? item.adjustment?.sourceRef ?? item.id;
  const first = sourceById.get(start);

  if (!first) {
    return null;
  }

  const ownerId = first.adjustment?.sourceRef;

  if (ownerId === undefined) {
    return first;
  }

  return sourceById.get(ownerId) ?? null;
};
