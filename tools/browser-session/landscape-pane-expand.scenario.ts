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
// The most the pane is pulled (`MAX_DRAG_SHIFT`), with a point of rounding.
const MAX_PULL = 121;

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

    // While the finger is down the whole pane follows it: further than the
    // old 28-point cap, still gaining as the finger goes on, never past the
    // limit, and it springs back when let go short of opening.
    const restingX = (await boxOf(handle, 'the drag handle')).x;
    const handleShift = async () =>
      restingX - (await boxOf(handle, 'the drag handle')).x;

    await page.mouse.move(paneArea.x, paneArea.bottomY);
    await page.mouse.down();
    await page.mouse.move(paneArea.x - 40, paneArea.bottomY, { steps: 6 });
    const nearShift = await handleShift();

    await page.mouse.move(paneArea.x - 400, paneArea.bottomY, { steps: 10 });
    const farShift = await handleShift();

    if (nearShift < 28 || farShift <= nearShift || farShift > MAX_PULL) {
      throw new Error(
        `the pane did not follow the finger with resistance (${nearShift} then ${farShift}, limit ${MAX_PULL})`,
      );
    }

    // The pane's trailing surface reaches past the window: it must not make the
    // page scrollable sideways (it once did, and carried the sheet with it).
    const overflow = await page.evaluate<number>(
      'document.documentElement.scrollWidth - document.documentElement.clientWidth',
    );

    if (overflow > 0) {
      throw new Error(`pulling the pane made the page ${overflow}px wider`);
    }

    await shot('2-pane-pulled');
    // Back to where it started, then let go: nothing opens.
    await page.mouse.move(paneArea.x, paneArea.bottomY, { steps: 10 });
    await page.mouse.up();
    await waitUntil(
      async () => Math.abs(await handleShift()) < 1,
      'the pane did not spring back',
    );

    if (await isOpen(page)) {
      throw new Error('letting go back at the start opened the playback view');
    }

    pass(
      'The whole pane follows a drag with resistance, past 28 points and under its limit, and springs back',
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

    // The same drag with a finger: a touch pointer is cancelled by the browser
    // when the element allows a pan (`touch-action`), which a mouse never
    // shows, so this is the check for the device.
    const cdp = await page.context().newCDPSession(page);

    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const touch = (
      type: 'touchStart' | 'touchMove' | 'touchEnd',
      x: number,
      y: number,
    ) =>
      cdp.send('Input.dispatchTouchEvent', {
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
        type,
      });

    await touch('touchStart', titleX, titleY);
    for (let step = 1; step <= 8; step += 1) {
      await touch('touchMove', titleX - (LONG_DRAG * step) / 8, titleY);
    }
    await touch('touchEnd', titleX - LONG_DRAG, titleY);
    await page.getByLabel('Dismiss playback').waitFor({ timeout: WAIT_MS });
    await close(page);
    pass('A finger drag from the title opens the playback view too');

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
