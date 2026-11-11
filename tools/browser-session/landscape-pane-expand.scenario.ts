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
// handle that says so, and dragging the pane opens it too. The pane sits at
// the window's trailing edge, so the handle is a vertical grabber on its
// leading (inner) edge, centred, and the drag runs toward the centre of the
// window (leftward). The transport and lyrics controls still do their own job.
const LANDSCAPE = { height: 390, width: 844 };
const TONE_SECONDS = 30;
const PANE_WIDTH = 280;
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

    const paneLeft = LANDSCAPE.width - PANE_WIDTH;
    const handleCentreY = handleBox.y + handleBox.height / 2;

    if (
      handleBox.height < 24 ||
      handleBox.width > 12 ||
      handleBox.x - paneLeft > 24 ||
      Math.abs(handleCentreY - LANDSCAPE.height / 2) > 40
    ) {
      throw new Error(
        `the handle is not a vertical grabber centred on the pane's inner edge (${JSON.stringify(handleBox)})`,
      );
    }

    await shot('1-pane-with-handle');
    pass('The pane shows a vertical drag handle on its inner edge, centred');

    // A tap on an empty part of the pane opens the playback view.
    await page.mouse.click(paneArea.x, paneArea.bottomY);
    await page.getByLabel('Dismiss playback').waitFor({ timeout: WAIT_MS });
    await close(page);
    pass('Tapping anywhere on the pane opens the full playback view');

    // A short drag toward the centre does not open; a long one does, and a
    // drag up (the old direction) does not.
    await page.mouse.move(paneArea.x, paneArea.bottomY);
    await page.mouse.down();
    await page.mouse.move(paneArea.x, paneArea.bottomY - LONG_DRAG, {
      steps: 8,
    });
    await page.mouse.up();
    await page.waitForTimeout(400);

    if (await isOpen(page)) {
      throw new Error('an upward drag opened the playback view');
    }

    await page.mouse.move(paneArea.x, paneArea.bottomY);
    await page.mouse.down();
    await page.mouse.move(paneArea.x - SHORT_DRAG, paneArea.bottomY, {
      steps: 4,
    });
    await page.mouse.up();
    await page.waitForTimeout(400);

    if (await isOpen(page)) {
      throw new Error('a short drag opened the playback view');
    }

    await page.mouse.move(paneArea.x, paneArea.bottomY);
    await page.mouse.down();
    await page.mouse.move(paneArea.x - LONG_DRAG, paneArea.bottomY, {
      steps: 8,
    });
    await page.mouse.up();
    await page.getByLabel('Dismiss playback').waitFor({ timeout: WAIT_MS });
    await close(page);
    pass(
      'Dragging the pane toward the centre opens the playback view; a short drag or an upward one does not',
    );

    // A drag may start on the title too, not only on the empty backdrop.
    const titleBox = await boxOf(pane, 'the pane title');
    const titleX = titleBox.x + titleBox.width / 2;
    const titleY = titleBox.y + titleBox.height / 2;

    await page.mouse.move(titleX, titleY);
    await page.mouse.down();
    await page.mouse.move(titleX - LONG_DRAG, titleY, { steps: 8 });
    await page.mouse.up();
    // Sample the sheet's close button while it settles: it comes in from the
    // trailing edge, so it moves sideways and not up or down.
    // A string script: the runner's transpiler would add helpers to a function
    // body that do not exist in the page.
    const samples = await page.evaluate<{ x: number; y: number }[]>(`
      new Promise((resolve) => {
        const found = [];
        const read = () => {
          const el = document.querySelector('[aria-label="Dismiss playback"]');

          if (el) {
            const rect = el.getBoundingClientRect();

            found.push({ x: rect.x, y: rect.y });
          }

          if (found.length < 12) {
            requestAnimationFrame(read);
          } else {
            resolve(found);
          }
        };

        requestAnimationFrame(read);
      })
    `);
    const xs = samples.map((sample) => sample.x);
    const ys = samples.map((sample) => sample.y);

    if (samples.length === 0) {
      throw new Error('dragging from the title did not open the playback view');
    }

    if (
      Math.max(...ys) - Math.min(...ys) > 1 ||
      Math.max(...xs) - Math.min(...xs) < 2
    ) {
      throw new Error(
        `the playback view did not slide in sideways (${JSON.stringify(samples)})`,
      );
    }

    await close(page);
    pass(
      'A drag that starts on the title opens the view, which slides in sideways',
    );

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
