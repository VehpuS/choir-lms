export type LyricsCandidate = {
  artist: string;
  durationMs?: number;
  plainLyrics: string;
  title: string;
};

export type LyricsLookupQuery = {
  artist?: string;
  durationMs?: number;
  title: string;
};

export type LyricsLookupFailureReason =
  | 'aborted'
  | 'no-results'
  | 'offline'
  | 'rate-limited'
  | 'unavailable';

export type LyricsLookupResult =
  | { candidates: LyricsCandidate[]; status: 'ok' }
  | { reason: LyricsLookupFailureReason; status: 'failed' };

/** Never throws: every failure is a typed result the editor maps to a message. */
export type LyricsLookupClient = {
  search(
    query: LyricsLookupQuery,
    options?: { signal?: AbortSignal },
  ): Promise<LyricsLookupResult>;
};

type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
}>;

const LRCLIB_SEARCH_URL = 'https://lrclib.net/api/search';
const LOOKUP_TIMEOUT_MS = 10_000;
const MAX_CANDIDATES = 8;
const RATE_LIMITED_STATUS = 429;
const TIMESTAMP_MARKER_PATTERN = /\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g;
const TRAILING_SPACE_PATTERN = /[^\S\n]+$/gm;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/** Timed lyrics are ignored; stray `[mm:ss.xx]` markers in plain text are removed. */
export const stripLyricsTimestamps = (text: string): string => {
  return text
    .replace(TIMESTAMP_MARKER_PATTERN, '')
    .replace(TRAILING_SPACE_PATTERN, '');
};

const parseCandidate = (value: unknown): LyricsCandidate | null => {
  if (
    !isRecord(value) ||
    typeof value.trackName !== 'string' ||
    typeof value.plainLyrics !== 'string'
  ) {
    return null;
  }

  const plainLyrics = stripLyricsTimestamps(value.plainLyrics).trim();

  if (plainLyrics.length === 0) {
    return null;
  }

  return {
    artist: typeof value.artistName === 'string' ? value.artistName : '',
    ...(typeof value.duration === 'number'
      ? { durationMs: Math.round(value.duration * 1000) }
      : {}),
    plainLyrics,
    title: value.trackName,
  };
};

/** Closest length first, so exact-length matches lead; stable otherwise. */
const rankByDuration = (
  candidates: LyricsCandidate[],
  durationMs: number | undefined,
): LyricsCandidate[] => {
  if (durationMs === undefined) {
    return candidates;
  }

  const distance = (candidate: LyricsCandidate) =>
    candidate.durationMs === undefined
      ? Number.POSITIVE_INFINITY
      : Math.abs(candidate.durationMs - durationMs);

  return candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort(
      (a, b) =>
        distance(a.candidate) - distance(b.candidate) || a.index - b.index,
    )
    .map(({ candidate }) => candidate);
};

export const parseLrclibSearchResponse = (
  body: unknown,
  durationMs?: number,
): LyricsCandidate[] => {
  if (!Array.isArray(body)) {
    return [];
  }

  const candidates = body.flatMap((entry) => {
    const candidate = parseCandidate(entry);

    return candidate ? [candidate] : [];
  });

  return rankByDuration(candidates, durationMs).slice(0, MAX_CANDIDATES);
};

export const createLrclibLyricsClient = (options: {
  fetch: FetchLike;
  timeoutMs?: number;
}): LyricsLookupClient => {
  const timeoutMs = options.timeoutMs ?? LOOKUP_TIMEOUT_MS;

  return {
    async search(query, searchOptions) {
      const controller = new AbortController();
      const callerSignal = searchOptions?.signal;
      let timedOut = false;
      const onCallerAbort = () => controller.abort();
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);

      if (callerSignal?.aborted) {
        clearTimeout(timer);
        return { reason: 'aborted', status: 'failed' };
      }

      callerSignal?.addEventListener('abort', onCallerAbort);

      try {
        const params = new URLSearchParams({ track_name: query.title });

        if (query.artist?.trim()) {
          params.set('artist_name', query.artist.trim());
        }

        const response = await options.fetch(
          `${LRCLIB_SEARCH_URL}?${params.toString()}`,
          { signal: controller.signal },
        );

        if (response.status === RATE_LIMITED_STATUS) {
          return { reason: 'rate-limited', status: 'failed' };
        }

        if (!response.ok) {
          return { reason: 'unavailable', status: 'failed' };
        }

        const candidates = parseLrclibSearchResponse(
          await response.json(),
          query.durationMs,
        );

        return candidates.length > 0
          ? { candidates, status: 'ok' }
          : { reason: 'no-results', status: 'failed' };
      } catch (error) {
        if (callerSignal?.aborted && !timedOut) {
          return { reason: 'aborted', status: 'failed' };
        }

        if (timedOut) {
          return { reason: 'unavailable', status: 'failed' };
        }

        // `fetch` rejects with a TypeError when there is no connection; a body
        // that is not JSON rejects from `json()` with a SyntaxError.
        return {
          reason: error instanceof SyntaxError ? 'unavailable' : 'offline',
          status: 'failed',
        };
      } finally {
        clearTimeout(timer);
        callerSignal?.removeEventListener('abort', onCallerAbort);
      }
    },
  };
};
