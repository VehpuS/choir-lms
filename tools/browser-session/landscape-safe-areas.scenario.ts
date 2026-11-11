import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { emulateInsets, expectClear, LANDSCAPE } from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// Issue #46: on an iPhone turned sideways the Dynamic Island, the home
// indicator and the rounded corners cover part of the screen. Chromium can
// emulate those insets (`Emulation.setSafeAreaInsetsOverride`), so this checks
// that sheets and the playback overlay keep their controls clear of them while
// their backdrop still reaches the screen edges (see safe-area-helpers.ts).
const TONE_SECONDS = 30;
const WAIT_MS = 5000;
const TOLERANCE_PX = 1;

type Band = { bottom: number; left: number; right: number } | null;

// The navigation band is the nearest painted ancestor holding both the Library
// and the Practice tools entries: the rail, or the bottom tab bar.
const readNavigationBand = async (page: Page): Promise<Band> => {
  const libraryEntry = page.getByRole('button', {
    exact: true,
    name: 'Library',
  });
  const toolsEntry = page.getByLabel('Practice tools', { exact: true });

  return libraryEntry.evaluate(
    (first, second) => {
      let node: HTMLElement | null = first.parentElement;

      while (
        node &&
        !(
          node.contains(second) &&
          getComputedStyle(node).backgroundColor !== 'rgba(0, 0, 0, 0)'
        )
      ) {
        node = node.parentElement;
      }

      const rect = node?.getBoundingClientRect();

      return rect
        ? { bottom: rect.bottom, left: rect.left, right: rect.right }
        : null;
    },
    await toolsEntry.elementHandle(),
  );
};

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  requires: ['chromium'],
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await emulateInsets(page);

    // The navigation band reaches the screen edges (its colour fills the inset
    // strips) while its entries stay clear of the insets.
    const libraryTab = page.getByRole('button', {
      exact: true,
      name: 'Library',
    });
    const toolsTab = page.getByLabel('Practice tools', { exact: true });

    await shot('0-tab-bar');
    await expectClear(libraryTab, 'the Library tab');
    await expectClear(toolsTab, 'the Practice tools tab');

    const band = await readNavigationBand(page);

    // At this size the tabs are the side rail: its background reaches the
    // leading and bottom edges, so it needs no right edge of its own.
    if (
      !band ||
      band.left > TOLERANCE_PX ||
      band.bottom < LANDSCAPE.height - TOLERANCE_PX
    ) {
      throw new Error(
        `the rail does not reach the leading and bottom screen edges: ${JSON.stringify(band)}`,
      );
    }

    pass('The rail reaches the screen edges and its entries stay clear');

    // A bottom sheet: its rows and its Cancel button stay clear of the insets.
    await page.getByLabel('Alto Part options').first().click();
    await page.getByText('Make loop', { exact: true }).waitFor({
      timeout: WAIT_MS,
    });
    await shot('1-options-sheet');
    await expectClear(
      page.getByText('Make loop', { exact: true }),
      'the Make loop row',
    );
    await expectClear(
      page.getByText('Cancel', { exact: true }).last(),
      'the Cancel button',
    );
    pass('The options sheet keeps its rows clear of the insets');
    await page.getByText('Cancel', { exact: true }).last().click();

    // The playback overlay: its buttons stay clear of the insets.
    await page.getByLabel('Play Alto Part').first().click();
    await waitUntil(async () => {
      const state = await readMediaState(page);

      return state !== null && !state.paused;
    }, 'the track did not start playing');
    await page.getByLabel(/^Now playing:/).click();
    await page.getByLabel('Dismiss playback').waitFor({ timeout: WAIT_MS });
    await shot('2-playback-sheet');
    await expectClear(
      page.getByLabel('Dismiss playback'),
      'the Dismiss playback button',
    );
    await expectClear(
      page.getByLabel('Forward 15 seconds'),
      'the Forward 15 seconds button',
    );
    pass('The playback sheet keeps its buttons clear of the insets');

    // Upright (the compact layout), the bottom tab bar reaches the left, right
    // and bottom edges, with insets like an iPhone's held upright.
    const portrait = { height: 844, width: 390 };
    const cdp = await page.context().newCDPSession(page);

    await page.getByLabel('Dismiss playback').click();
    await page.setViewportSize(portrait);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', {
      insets: { bottom: 34, left: 20, right: 20, top: 47 },
    });
    await waitUntil(async () => {
      const upright = await readNavigationBand(page);

      return upright !== null && upright.right > portrait.width / 2;
    }, 'the bottom tab bar did not return');

    const upright = await readNavigationBand(page);

    await shot('3-portrait-tab-bar');

    if (
      !upright ||
      upright.left > TOLERANCE_PX ||
      upright.right < portrait.width - TOLERANCE_PX ||
      upright.bottom < portrait.height - TOLERANCE_PX
    ) {
      throw new Error(
        `the tab bar band does not reach the screen edges: ${JSON.stringify(upright)}`,
      );
    }

    pass('The bottom tab bar reaches the screen edges when held upright');
  },
  viewport: LANDSCAPE,
});
