import type { Locator, Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { WAIT_MS } from './piano-helpers';
import { emulateInsets, settledBox } from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// Issue #46 (device feedback after #56): opening the piano from the full
// playback view in the wide-short layout squeezed the two-column sheet into
// the 250 points above a 138-point keyboard and clipped its title and
// transport. The keyboard cannot share a 390-point window with that view, so
// over it the piano is full screen (with the chip to pause), and the playback
// view keeps its whole height underneath.
const LANDSCAPE = { height: 390, width: 844 };
const TONE_SECONDS = 30;
const TOLERANCE = 3;
const FULL_SCREEN_KEYS_HEIGHT = 350;

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

const boxOf = async (target: Locator, name: string) => {
  const box = await settledBox(target);

  if (!box) {
    throw new Error(`${name} is not on screen`);
  }

  return box;
};

void runScenario({
  // The finger part uses Chrome DevTools touch events (see safe-area-helpers).
  requires: ['chromium'],
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  steps: async ({
    page,
    pass,
    shot,
  }: {
    page: Page;
    pass: (m: string) => void;
    shot: (n: string) => Promise<void>;
  }) => {
    await waitForTrack(page, 'Alto Part');
    await page.getByLabel('Play Alto Part').first().click();
    await waitUntil(
      async () => (await readMediaState(page))?.paused === false,
      'the track did not play',
    );
    await page.setViewportSize(LANDSCAPE);
    await page.getByTestId('now-playing-pane').waitFor({ timeout: WAIT_MS });
    await page.getByLabel(/^Now playing:/).click();
    // Two landmarks: the tools button at the top and the speed tile at the bottom.
    const toolsButton = page.getByLabel('Playback practice tools');
    const speedTile = page.getByText('Speed', { exact: true }).first();

    await toolsButton.waitFor({ timeout: WAIT_MS });
    const toolsBefore = await boxOf(toolsButton, 'the tools button');
    const speedBefore = await boxOf(speedTile, 'the speed tile');

    // Piano from the playback view's own tools button.
    await toolsButton.click();
    await page.getByLabel('Piano, off').click();
    await page.getByTestId('piano-keyboard').waitFor({ timeout: WAIT_MS });

    const keys = await boxOf(
      page.getByTestId('piano-keyboard'),
      'the keyboard',
    );

    if (Math.abs(keys.height - FULL_SCREEN_KEYS_HEIGHT) > TOLERANCE) {
      throw new Error(
        `the piano over the playback view is not full screen (keys ${Math.round(keys.height)} high)`,
      );
    }

    await shot('1-piano-over-playback');
    pass('Over the playback view the piano is full screen');

    // Nothing to exit to: full screen is the only fit here.
    if ((await page.getByLabel('Exit full screen').count()) !== 0) {
      throw new Error('Exit full screen is offered over the playback view');
    }

    // The chip pauses the track; the piano's Close leaves the view whole.
    await page.getByTestId('piano-playing-chip').click();
    await waitUntil(
      async () => (await readMediaState(page))?.paused === true,
      'the chip did not pause the track',
    );
    await page.getByLabel('Close piano').click();
    await page.getByTestId('piano-keyboard').waitFor({
      state: 'detached',
      timeout: WAIT_MS,
    });
    const toolsAfter = await boxOf(toolsButton, 'the tools button');
    const speedAfter = await boxOf(speedTile, 'the speed tile');

    if (
      Math.abs(toolsAfter.y - toolsBefore.y) > TOLERANCE ||
      Math.abs(speedAfter.y - speedBefore.y) > TOLERANCE
    ) {
      throw new Error('the playback view moved while the piano was open');
    }

    // Device feedback: the tools menu opened from the playback view's
    // header was clipped by the sheet's edge ("PRACTICE TOOLS" lost its first
    // letter). With a Dynamic Island inset, every row stays inside the sheet.
    await emulateInsets(page);
    await toolsButton.click();
    const row = page.getByLabel('Piano, off');

    await row.waitFor({ timeout: WAIT_MS });
    await settledBox(row);

    const clipped = await row.evaluate((element) => {
      const rect = element.getBoundingClientRect();

      for (let node = element.parentElement; node; node = node.parentElement) {
        const { overflowX } = getComputedStyle(node);

        if (overflowX !== 'visible') {
          const box = node.getBoundingClientRect();

          if (rect.left < box.left - 1 || rect.right > box.right + 1) {
            return true;
          }
        }
      }

      return false;
    });

    if (clipped) {
      throw new Error(
        'the practice tools menu is clipped by the playback sheet',
      );
    }

    await shot('3-tools-menu');
    pass('The practice tools menu fits inside the playback sheet');
    await page.keyboard.press('Escape');
    await shot('2-view-whole');
    pass(
      'Closing the piano leaves the playback view whole, track paused by the chip',
    );
  },
});
