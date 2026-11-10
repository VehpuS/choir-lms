import {
  buildDefaultMockLibrary,
  buildMockSource,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import {
  assertAacPlayable,
  buildChoirStemMedia,
  buildToneMedia,
} from './mock-media';
import { runScenario } from './scenario-runner';

// Proves the deterministic media: a generated tone and the real AAC stem play
// through Drive as real files (the player reports their real lengths), and the
// web-link server honours Range requests, so seeking works.
const TONE_SECONDS = 20;
const TONE_URL = 'https://media.example.test/tone.wav';
const PARTIAL_CONTENT_STATUS = 206;
const PLAYBACK_TIMEOUT_MS = 10_000;
const tone = buildToneMedia({ seconds: TONE_SECONDS });
const library = buildDefaultMockLibrary();
const toneSource = buildMockSource('Alto Part');
const stemSource = buildMockSource('Tenor Part');

library.sources = [toneSource, stemSource];

void runScenario({
  drive: {
    media: {
      [toneSource.driveFileId]: tone,
      [stemSource.driveFileId]: buildChoirStemMedia(),
    },
    state: 'authorized',
  },
  library,
  webFiles: { [TONE_URL]: tone },
  steps: async ({ page, pass, shot }) => {
    await assertAacPlayable(page);
    pass('this browser decodes AAC');

    await page.getByLabel('Alto Part options').first().waitFor();

    await page.getByText('Alto Part', { exact: true }).first().click();
    await page
      .getByText(/Playing · [\d:]+ of 0:20/)
      .waitFor({ timeout: PLAYBACK_TIMEOUT_MS });
    await shot('tone-playing');
    pass('a generated 20 s tone plays and reports its real length');

    await page.getByText('Tenor Part', { exact: true }).first().click();
    await page
      .getByText(/Playing · [\d:]+ of 0:03/)
      .waitFor({ timeout: PLAYBACK_TIMEOUT_MS });
    await shot('stem-playing');
    pass('the AAC choir stem decodes and reports its real length');

    const partial = await page.evaluate(async (url) => {
      const response = await fetch(url, { headers: { Range: 'bytes=10-19' } });

      return {
        bytes: (await response.arrayBuffer()).byteLength,
        range: response.headers.get('content-range'),
        status: response.status,
      };
    }, TONE_URL);

    if (
      partial.status !== PARTIAL_CONTENT_STATUS ||
      partial.bytes !== 10 ||
      !partial.range?.startsWith('bytes 10-19/')
    ) {
      throw new Error(`Range was not honoured: ${JSON.stringify(partial)}`);
    }

    pass('web files answer a Range request with a partial response');
  },
});
