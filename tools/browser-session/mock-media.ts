import type { Page, Route } from 'playwright';

import {
  CHOIR_STEM_FILE,
  readFixtureBytes,
} from '../../packages/mobile-rehearsal-player/src/test-support/fixtures/choir-fixtures';
import {
  buildToneWav,
  type ToneWavOptions,
} from '../../packages/mobile-rehearsal-player/src/test-support/audio/tone-wav';

// Deterministic audio for browser scenarios: files of known length and pitch,
// served locally (as Drive media or from a web address) with Range support so
// the player can seek, and never any live audio.
const OK_STATUS = 200;
const PARTIAL_CONTENT_STATUS = 206;
const RANGE_NOT_SATISFIABLE_STATUS = 416;
const RANGE_PATTERN = /^bytes=(\d*)-(\d*)$/;
const CHOIR_STEM_CONTENT_TYPE = 'audio/mp4';
const AAC_CODEC_TYPE = 'audio/mp4; codecs="mp4a.40.2"';
/** Lets a cross-origin page read the headers a seeking player depends on. */
const MEDIA_CORS_HEADERS = {
  'access-control-allow-headers': '*',
  'access-control-allow-origin': '*',
  'access-control-expose-headers':
    'content-length, content-range, accept-ranges',
};

export type MockMedia = { body: Buffer; contentType: string };

/** A generated tone as a WAV file; `seconds: 600` is a ten-minute track. */
export const buildToneMedia = (options: ToneWavOptions): MockMedia => ({
  body: buildToneWav(options),
  contentType: 'audio/wav',
});

/** The committed choir stem (E4, C#4, then C4) as the AAC `.m4a` Drive serves. */
export const buildChoirStemMedia = (): MockMedia => ({
  body: readFixtureBytes(CHOIR_STEM_FILE),
  contentType: CHOIR_STEM_CONTENT_TYPE,
});

const parseRange = (
  header: string | undefined,
  size: number,
): { end: number; start: number } | 'unsatisfiable' | undefined => {
  const match = header ? RANGE_PATTERN.exec(header) : null;

  if (!match) {
    return undefined;
  }

  const [, startText, endText] = match;
  // `bytes=-N` is the last N bytes.
  const start = startText === '' ? size - Number(endText) : Number(startText);
  const end = startText === '' || endText === '' ? size - 1 : Number(endText);

  if (Number.isNaN(start) || start < 0 || start >= size) {
    return 'unsatisfiable';
  }

  return { end: Math.min(end, size - 1), start };
};

/** Answers a media request in full, or as a partial response when it asks for a range. */
export const fulfillMedia = (route: Route, media: MockMedia) => {
  const size = media.body.length;
  const range = parseRange(route.request().headers()['range'], size);

  if (range === 'unsatisfiable') {
    return route.fulfill({
      headers: { ...MEDIA_CORS_HEADERS, 'content-range': `bytes */${size}` },
      status: RANGE_NOT_SATISFIABLE_STATUS,
    });
  }

  if (!range) {
    return route.fulfill({
      body: media.body,
      contentType: media.contentType,
      headers: { ...MEDIA_CORS_HEADERS, 'accept-ranges': 'bytes' },
      status: OK_STATUS,
    });
  }

  return route.fulfill({
    body: media.body.subarray(range.start, range.end + 1),
    contentType: media.contentType,
    headers: {
      ...MEDIA_CORS_HEADERS,
      'accept-ranges': 'bytes',
      'content-range': `bytes ${range.start}-${range.end}/${size}`,
    },
    status: PARTIAL_CONTENT_STATUS,
  });
};

/**
 * Fails fast when the browser cannot decode AAC (some Chromium builds ship
 * without it), instead of a stem scenario failing later in a confusing way.
 */
export const assertAacPlayable = async (page: Page) => {
  const verdict = await page.evaluate(
    (type) => document.createElement('audio').canPlayType(type),
    AAC_CODEC_TYPE,
  );

  if (verdict === '') {
    throw new Error(
      'This browser cannot decode AAC, which the choir stem needs.',
    );
  }
};
