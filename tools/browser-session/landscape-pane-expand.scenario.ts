import type { Locator, Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { WAIT_MS } from './piano-helpers';
import { settledBox } from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// User request after the iPhone check: in the wide-short layout the whole Now
// Playing pane opens the full playback view (not only its title), with a drag
// handle at its top that says so, and dragging the pane up opens it too. The
// transport and lyrics controls still do their own job.
const LANDSCAPE = { height: 390, width: 844 };
const TONE_SECONDS = 30;
const SHORT_DRAG = 20;
const LONG_DRAG = 90;

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

const boxOf = async (target: Locator, name: string) => {
  const box = await settledBox(target);

  if (!box) {
    throw new Error(`${name} is not on screen`);
  }

  return box;
};

const isOpen = (page: Page) =>
  page
    .getByLabel('Dismiss playback')
    .isVisible()
    .catch(() => false);

const close = async (page: Page) => {
  await page.getByLabel('Dismiss playback').click();
  await page
    .getByLabel('Dismiss playback')
    .waitFor({ state: 'detached', timeout: WAIT_MS });
};

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
    const pane = page.getByTestId('now-playing-pane');

    await pane.waitFor({ timeout: WAIT_MS });
    // The title button is the pane's accessible control; the pane around it is
    // the area to tap. Its right edge is the window's, 280 points wide.
    const paneArea = {
      x: LANDSCAPE.width - 140,
      bottomY: LANDSCAPE.height - 24,
    };

    // The handle says the pane expands.
    const handle = page.getByTestId('now-playing-pane-handle');

    await handle.waitFor({ timeout: WAIT_MS });
    const handleBox = await boxOf(handle, 'the drag handle');

    if (handleBox.width < 24 || handleBox.y > 60) {
      throw new Error(
        `the handle is not a visible grabber at the pane's top (${JSON.stringify(handleBox)})`,
      );
    }

    await shot('1-pane-with-handle');
    pass('The pane shows a drag handle at its top');

    // A tap on an empty part of the pane opens the playback view.
    await page.mouse.click(paneArea.x, paneArea.bottomY);
    await page.getByLabel('Dismiss playback').waitFor({ timeout: WAIT_MS });
    await close(page);
    pass('Tapping anywhere on the pane opens the full playback view');

    // A short drag up does not open; a long one does.
    await page.mouse.move(paneArea.x, paneArea.bottomY);
    await page.mouse.down();
    await page.mouse.move(paneArea.x, paneArea.bottomY - SHORT_DRAG, {
      steps: 4,
    });
    await page.mouse.up();
    await page.waitForTimeout(400);

    if (await isOpen(page)) {
      throw new Error('a short drag opened the playback view');
    }

    await page.mouse.move(paneArea.x, paneArea.bottomY);
    await page.mouse.down();
    await page.mouse.move(paneArea.x, paneArea.bottomY - LONG_DRAG, {
      steps: 8,
    });
    await page.mouse.up();
    await page.getByLabel('Dismiss playback').waitFor({ timeout: WAIT_MS });
    await close(page);
    pass('Dragging the pane up opens the playback view; a short drag does not');

    // The pane's own controls keep working without opening it.
    await page
      .getByLabel(/^Pause/)
      .last()
      .click();
    await waitUntil(
      async () => (await readMediaState(page))?.paused === true,
      'the pane did not pause the track',
    );
    await page.waitForTimeout(400);

    if (await isOpen(page)) {
      throw new Error('pressing pause opened the playback view');
    }

    pass('The pane transport still works without opening the view');
  },
  viewport: LANDSCAPE,
});
