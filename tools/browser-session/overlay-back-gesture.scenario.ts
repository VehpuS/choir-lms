import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { openTrackMenu, waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// web-platform-modernization 1.2 (F5): the browser's Back (the Android
// gesture, the browser button) closes the topmost open layer and stays in the
// app instead of leaving the page; a layer closed another way leaves no
// history entry behind. (Task 3.3.)
const TONE_SECONDS = 30;
const WAIT_MS = 5000;
const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

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

    const appUrl = page.url();

    // A Modal sheet (the track menu) closes on Back too.
    await openTrackMenu(page, 'Alto Part');
    await page.getByRole('dialog').waitFor({ timeout: WAIT_MS });
    await page.goBack({ timeout: WAIT_MS });
    await page
      .getByRole('dialog')
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    pass('Back closes a sheet and stays in the app');

    const tools = page.getByLabel('Playback practice tools');

    await page.getByLabel(/^Now playing:/).click();
    await tools.waitFor({ timeout: WAIT_MS });
    await page.goBack({ timeout: WAIT_MS }).catch(() => null);

    assert.equal(page.url(), appUrl, 'Back left the app with a sheet open');
    await tools.waitFor({ state: 'detached', timeout: WAIT_MS });
    pass('Back closes the playback view and stays in the app');

    // Layers stack: Back closes the menu over the view first, then the view.
    const pianoRow = page.getByLabel('Piano, off');

    await page.getByLabel(/^Now playing:/).click();
    await tools.waitFor({ timeout: WAIT_MS });
    await tools.click();
    await pianoRow.waitFor({ timeout: WAIT_MS });
    await page.goBack({ timeout: WAIT_MS });
    await pianoRow.waitFor({ state: 'detached', timeout: WAIT_MS });
    assert.equal(await tools.count(), 1, 'Back closed the view with the menu');
    assert.equal(page.url(), appUrl);
    pass('Back closes the menu over the view and leaves the view open');

    await page.goBack({ timeout: WAIT_MS });
    await tools.waitFor({ state: 'detached', timeout: WAIT_MS });
    assert.equal(page.url(), appUrl);
    pass('A second Back closes the view');

    // Closing with Escape gives the entry back. Read from the history itself
    // rather than by going Back out of the app (browsers differ on whether the
    // first entry can be reached): a sentinel entry is pushed first, and once
    // the sheet is closed the page must be on the sentinel, not on a leftover
    // sheet entry.
    await page.evaluate("history.pushState({ sentinel: true }, '')");
    await page.getByLabel(/^Now playing:/).click();
    await tools.waitFor({ timeout: WAIT_MS });
    assert.equal(
      await page.evaluate('history.state?.choirlmsOverlay === true'),
      true,
      'opening the view added no history entry',
    );
    await page.keyboard.press('Escape');
    await tools.waitFor({ state: 'detached', timeout: WAIT_MS });
    await waitUntil(
      async () =>
        (await page.evaluate('history.state?.sentinel === true')) === true,
      'Escape left a stale history entry: the page is not back on the entry before the sheet',
    );
    pass('Closing with Escape leaves no history entry behind');
  },
});
