import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// web-platform-modernization 1.2 (F5): the browser's Back (the Android
// gesture, the browser button) closes the open sheet and stays in the app
// instead of leaving the page. Expected to fail until task 3.3 decides and
// builds it.
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

    const tools = page.getByLabel('Playback practice tools');
    const appUrl = page.url();

    await page.getByLabel(/^Now playing:/).click();
    await tools.waitFor({ timeout: WAIT_MS });
    await page.goBack({ timeout: WAIT_MS }).catch(() => null);

    assert.equal(page.url(), appUrl, 'Back left the app with a sheet open');
    await tools.waitFor({ state: 'detached', timeout: WAIT_MS });
    pass('Back closes the playback view and stays in the app');
  },
});
