import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { WAIT_MS } from './piano-helpers';
import { runScenario } from './scenario-runner';

// Issue #46, follow-up F.6: in the two-column playback view, tapping outside
// the Practice tools menu closes it. Its backdrop used to sit inside the left
// column's stacking context, so a tap on the right column reached the column
// and the menu stayed open (Escape worked).
const LANDSCAPE = { height: 390, width: 844 };
const TONE_SECONDS = 30;
const RIGHT_COLUMN_POINT = { x: 640, y: 260 };
const LEFT_COLUMN_POINT = { x: 60, y: 330 };

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await page.getByLabel('Play Alto Part').first().click();
    await waitUntil(
      async () => (await readMediaState(page))?.paused === false,
      'the track did not play',
    );
    await page.setViewportSize(LANDSCAPE);
    await page.getByTestId('now-playing-pane').waitFor({ timeout: WAIT_MS });
    await page.getByLabel(/^Now playing:/).click();

    const tools = page.getByLabel('Playback practice tools');
    const row = page.getByLabel('Piano, off');

    for (const [name, point] of [
      ['the right column', RIGHT_COLUMN_POINT],
      ['the left column', LEFT_COLUMN_POINT],
    ] as const) {
      await tools.click();
      await row.waitFor({ timeout: WAIT_MS });
      await page.mouse.click(point.x, point.y);
      await row.waitFor({ state: 'detached', timeout: WAIT_MS }).catch(() => {
        throw new Error(`tapping ${name} did not close the tools menu`);
      });
    }

    await shot('1-closed');
    pass('Tapping outside the practice tools menu closes it, in either column');

    // The tap only dismissed: it did not also act on what was under it.
    await page
      .getByLabel('Playback practice tools')
      .waitFor({ timeout: WAIT_MS });
    pass('The playback view is still open after dismissing the menu');
  },
  viewport: LANDSCAPE,
});
