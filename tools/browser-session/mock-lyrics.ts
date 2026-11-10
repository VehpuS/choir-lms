import type { BrowserContext } from 'playwright';

// A stand-in for the lyrics lookup service (LRCLIB). The app's Look up button
// searches `https://lrclib.net/api/search`; this answers it locally with the
// candidates a scenario gives, and records what was searched.
const LOOKUP_PATTERN = /^https:\/\/lrclib\.net\/api\/search/;
const OK_STATUS = 200;
const NO_CONTENT_STATUS = 204;
const CORS_HEADERS = {
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'access-control-allow-origin': '*',
};

/** One result as the service returns it. */
export type MockLyricsCandidate = {
  artistName: string;
  /** Length in seconds; the app ranks the closest to the track first. */
  duration?: number;
  plainLyrics: string;
  trackName: string;
};

export type MockLyricsRecorder = {
  /** Every search the app made, as the full request address. */
  searches: string[];
};

export const installMockLyricsLookup = async (
  context: BrowserContext,
  candidates: MockLyricsCandidate[],
): Promise<MockLyricsRecorder> => {
  const recorder: MockLyricsRecorder = { searches: [] };

  await context.route(LOOKUP_PATTERN, (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({
        headers: CORS_HEADERS,
        status: NO_CONTENT_STATUS,
      });
    }

    recorder.searches.push(route.request().url());

    return route.fulfill({
      body: JSON.stringify(candidates),
      contentType: 'application/json',
      headers: CORS_HEADERS,
      status: OK_STATUS,
    });
  });

  return recorder;
};
