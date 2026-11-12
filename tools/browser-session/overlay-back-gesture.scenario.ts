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

    // Closing with Escape gives the entry back: the next Back leaves the app,
    // as it did before any sheet opened, rather than doing nothing.
    await page.getByLabel(/^Now playing:/).click();
    await tools.waitFor({ timeout: WAIT_MS });
    await page.keyboard.press('Escape');
    await tools.waitFor({ state: 'detached', timeout: WAIT_MS });
    await page.goBack({ timeout: WAIT_MS }).catch(() => null);
    assert.notEqual(
      page.url(),
      appUrl,
      'Escape left a stale history entry: Back stayed on the app',
    );
    pass('Closing with Escape leaves no history entry behind');
  },
});
