import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// web-platform-modernization 1.2c (F11): a link the app opens in a new window
// does not give that window a reference back to the app. The lyrics editor's
// web search opens an external page; `window.open` is replaced by a recorder
// so nothing leaves the machine, and the features it was called with are read.
const TONE_SECONDS = 60;
const WAIT_MS = 5000;
const TRACK = 'Tenor Part';
const track = buildMockSource(TRACK, { durationMs: TONE_SECONDS * 1000 });

// A string, not a function: the test runner's transform injects a `__name`
// helper into named functions, which the page does not have.
const RECORD_OPEN = `
  window.__opened = [];
  window.open = (url, target, features) => {
    window.__opened.push({ features: features ?? '', target: target ?? '', url: String(url) });
    return null;
  };
`;

type Opened = { features: string; target: string; url: string };

void runScenario({
  drive: {
    media: { [track.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [track] },
  mediaProbe: true,
  steps: async ({ page, pass }) => {
    await waitForTrack(page, TRACK);
    await page.evaluate(RECORD_OPEN);

    await page.getByLabel(`Play ${TRACK}`).first().click();
    await waitUntil(async () => {
      const state = await readMediaState(page);

      return state !== null && !state.paused;
    }, 'the track did not start playing');
    await page.getByLabel(/^Now playing:/).click();
    await page.getByRole('button', { name: 'Add lyrics' }).click();
    await page
      .getByLabel(/^Search (Google|DuckDuckGo|Genius)$/)
      .first()
      .click({ timeout: WAIT_MS });

    const opened = await page.evaluate<Opened[]>('window.__opened');

    assert.equal(opened.length, 1, 'the web search did not open one window');
    assert.match(opened[0].url, /^https:\/\//);
    assert.match(
      opened[0].features,
      /noopener/,
      `the window was opened without noopener (features: "${opened[0].features}")`,
    );
    pass('The web search opens its window with noopener');
  },
});
