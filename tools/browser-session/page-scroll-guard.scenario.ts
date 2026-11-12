import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { WAIT_MS } from './piano-helpers';
import { runScenario } from './scenario-runner';

// Device report (iPhone, home-screen web app, landscape): after opening and
// closing the playback sheet the whole layout stayed pushed from the top, as if
// the page had been scrolled, and only turning the phone back fixed it. The body
// is `overflow: hidden`, so a page the browser shifts cannot be scrolled back by
// the person. Chromium never shifts it by itself, so the scenario shifts it the
// way iOS does (a programmatic page scroll) and checks the app puts it back.
const LANDSCAPE = { height: 390, width: 844 };
const TONE_SECONDS = 30;
const SHIFT = 60;

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

// A string script: the runner's transpiler would add helpers to a function
// body that do not exist in the page.
const makePageScrollable = `(() => {
  const filler = document.createElement('div');

  filler.id = 'scroll-probe-filler';
  filler.style.cssText = 'height: 3000px; width: 1px; position: absolute; top: 0; left: 0; pointer-events: none';
  document.body.appendChild(filler);
})()`;

const scrollOffset = (page: Page) =>
  page.evaluate<number[]>('[window.scrollX, window.scrollY]');

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  steps: async ({ page, pass }) => {
    await waitForTrack(page, 'Alto Part');
    await page.getByLabel('Play Alto Part').first().click();
    await waitUntil(
      async () => (await readMediaState(page))?.paused === false,
      'the track did not play',
    );
    await page.setViewportSize(LANDSCAPE);
    await page.evaluate(makePageScrollable);

    // Open and close the playback sheet, then the browser shifts the page.
    await page.getByTestId('now-playing-pane').click();
    await page.getByLabel('Dismiss playback').waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Dismiss playback').click();
    await page
      .getByLabel('Dismiss playback')
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    await page.evaluate(`window.scrollTo(0, ${SHIFT})`);

    await waitUntil(async () => {
      const [x, y] = await scrollOffset(page);

      return x === 0 && y === 0;
    }, 'the shifted page was not put back at the top');
    pass('A page shifted after the sheet closes is put back at the top');

    // And sideways, and again later (not only the first time).
    await page.evaluate(`window.scrollTo(20, ${SHIFT})`);
    await waitUntil(async () => {
      const [x, y] = await scrollOffset(page);

      return x === 0 && y === 0;
    }, 'the page shifted a second time was not put back');
    pass('It is put back every time, in both directions');

    // A focused text field keeps what the keyboard did to the page.
    await page.evaluate(`(() => {
      const field = document.createElement('input');

      field.id = 'scroll-probe-field';
      field.style.cssText = 'position: absolute; top: 0; left: 0; opacity: 0';
      document.body.appendChild(field);
      field.focus();
      window.scrollTo(0, ${SHIFT});
    })()`);
    await page.waitForTimeout(400);
    const [, whileEditing] = await scrollOffset(page);

    if (whileEditing === 0) {
      throw new Error('the page was reset while a text field had focus');
    }

    pass('The page is left alone while a text field has focus');
  },
  viewport: LANDSCAPE,
});
