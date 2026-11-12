import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// web-platform-modernization 1.2 (F5): one Escape closes only the topmost
// layer. The practice tools menu opens over the playback view, so the first
// Escape closes the menu and leaves the view; the second closes the view.
//
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
    await page.getByLabel(/^Now playing:/).click();

    const tools = page.getByLabel('Playback practice tools');
    const pianoRow = page.getByLabel('Piano, off');

    await tools.click();
    await pianoRow.waitFor({ timeout: WAIT_MS });

    await page.keyboard.press('Escape');
    await pianoRow.waitFor({ state: 'detached', timeout: WAIT_MS });
    assert.equal(
      await tools.count(),
      1,
      'one Escape closed the playback view along with the menu',
    );
    pass('One Escape closes only the menu over the playback view');

    await page.keyboard.press('Escape');
    await tools.waitFor({ state: 'detached', timeout: WAIT_MS });
    pass('A second Escape closes the playback view');
  },
});
