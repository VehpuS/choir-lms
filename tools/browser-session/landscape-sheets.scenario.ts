import type { Locator, Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { settledBox } from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// Issue #46, Part 2 (task 3.4a): in a wide, short window a bottom sheet is a
// full-height panel against the trailing edge, so its list is not clipped by
// the short window; upright it is still the bottom sheet. The track's options
// menu and the Add to playlist sheet stand for the shared bottom sheet.
const LANDSCAPE = { height: 390, width: 844 };
const PORTRAIT = { height: 844, width: 390 };
const SIDE_SHEET_WIDTH = 380;
const WIDTH_TOLERANCE = 12;
const WAIT_MS = 5000;
const TONE_SECONDS = 30;

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

const boxOf = async (target: Locator, name: string) => {
  const box = await settledBox(target);

  if (!box) {
    throw new Error(`${name} is not on screen`);
  }

  return box;
};

const openOptions = async (page: Page) => {
  await page.getByLabel('Alto Part options').first().click();
  await page
    .getByText('Make loop', { exact: true })
    .waitFor({ timeout: WAIT_MS });
};

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await page.setViewportSize(LANDSCAPE);
    await waitUntil(async () => {
      const box = await page
        .getByRole('button', { exact: true, name: 'Library' })
        .boundingBox();

      return box !== null && box.x + box.width < LANDSCAPE.width / 4;
    }, 'the side rail did not appear');

    // The options menu: a panel on the trailing edge, every action reachable.
    await openOptions(page);
    await shot('1-options-side-sheet');

    const makeLoop = await boxOf(
      page.getByText('Make loop', { exact: true }),
      'Make loop',
    );
    const cancel = await boxOf(
      page.getByText('Cancel', { exact: true }).last(),
      'Cancel',
    );

    if (makeLoop.x < LANDSCAPE.width - SIDE_SHEET_WIDTH - WIDTH_TOLERANCE) {
      throw new Error(
        `the menu is not a panel on the trailing edge (Make loop at x ${Math.round(makeLoop.x)})`,
      );
    }

    if (cancel.y + cancel.height > LANDSCAPE.height) {
      throw new Error(
        `Cancel is below the fold (bottom ${Math.round(cancel.y + cancel.height)})`,
      );
    }

    const lastAction = page.getByText('Open in Google Drive', { exact: true });

    await lastAction.scrollIntoViewIfNeeded();

    const last = await boxOf(lastAction, 'Open in Google Drive');

    if (last.y + last.height > LANDSCAPE.height) {
      throw new Error('the last action cannot be scrolled into view');
    }

    pass(
      'The options menu is a trailing side sheet with every action reachable',
    );

    // The scrim beside it dismisses it.
    await page.mouse.click(LANDSCAPE.width / 6, LANDSCAPE.height / 2);
    await page
      .getByText('Make loop', { exact: true })
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    pass('Tapping the scrim beside the side sheet dismisses it');

    // Another sheet that goes through the same surface: Add to playlist.
    await openOptions(page);
    await page.getByText('Add to playlist', { exact: true }).click();
    const newPlaylist = page.getByText('New playlist…', { exact: true });

    await newPlaylist.waitFor({ timeout: WAIT_MS });
    await shot('2-add-to-playlist-side-sheet');

    const row = await boxOf(newPlaylist, 'the New playlist row');

    if (row.x < LANDSCAPE.width - SIDE_SHEET_WIDTH - WIDTH_TOLERANCE) {
      throw new Error('the Add to playlist sheet is not on the trailing edge');
    }

    pass('The Add to playlist sheet is a trailing side sheet too');
    await page.mouse.click(LANDSCAPE.width / 6, LANDSCAPE.height / 2);

    // Upright: the bottom sheet, as before.
    await page.setViewportSize(PORTRAIT);
    await waitUntil(async () => {
      const box = await page
        .getByRole('button', { exact: true, name: 'Library' })
        .boundingBox();

      return box !== null && box.y > PORTRAIT.height / 2;
    }, 'the bottom tabs did not return');
    await openOptions(page);

    const upright = await boxOf(
      page.getByText('Make loop', { exact: true }),
      'Make loop',
    );

    if (upright.x > PORTRAIT.width / 4) {
      throw new Error(
        `upright the menu is not full width (Make loop at x ${Math.round(upright.x)})`,
      );
    }

    const uprightCancel = await boxOf(
      page.getByText('Cancel', { exact: true }).last(),
      'Cancel',
    );

    if (uprightCancel.y < PORTRAIT.height * 0.75) {
      throw new Error('upright the menu is not at the bottom');
    }

    await shot('3-portrait-bottom-sheet');
    pass('Upright keeps the bottom sheet');
  },
  viewport: PORTRAIT,
});
