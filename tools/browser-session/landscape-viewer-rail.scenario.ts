import { readFileSync } from 'node:fs';
import type { Page } from 'playwright';

import {
  buildMockPdfSheetMusic,
  buildMockSource,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { buildToneMedia } from './mock-media';
import { waitForTrack } from './page-helpers';
import {
  emulateInsets,
  INSETS,
  LANDSCAPE,
  settledBox,
} from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// Issue #46, F.8: in the wide-short layout the sheet music viewer's side rail
// (close, zoom, layout, page steps, practice tools, play) fits the window
// without scrolling, so its last button (play / pause) is not cut off.
const TONE_SECONDS = 30;
const WAIT_MS = 5000;
const SCORE_URL = 'https://mock-scores.test/soprano.pdf';
const SCORE_FIXTURE =
  'packages/mobile-rehearsal-player/src/test-support/fixtures/snow-soprano-four-pages.pdf';
const RAIL_MIN_LEFT = 600;
const TOLERANCE = 1;

const soprano = buildMockSource('Soprano Part', {
  durationMs: TONE_SECONDS * 1000,
  sheetMusic: [buildMockPdfSheetMusic('Soprano score', SCORE_URL)],
});

/** The rail's buttons with their names and boxes, top to bottom. */
const railButtons = (page: Page) =>
  page.getByRole('button').evaluateAll(
    (nodes, minLeft) =>
      nodes
        .map((node) => {
          const { bottom, left, top } = node.getBoundingClientRect();

          return {
            bottom,
            label: node.getAttribute('aria-label') ?? '',
            left,
            top,
          };
        })
        .filter((button) => button.left >= minLeft && button.bottom > 0)
        .sort((a, b) => a.top - b.top),
    RAIL_MIN_LEFT,
  );

const expectRailInWindow = async (page: Page, when: string) => {
  const buttons = await railButtons(page);
  const last = buttons[buttons.length - 1];

  if (!last || buttons.length < 4) {
    throw new Error(`${when}: the rail has ${buttons.length} buttons`);
  }

  if (last.bottom > LANDSCAPE.height - INSETS.bottom + TOLERANCE) {
    throw new Error(
      `${when}: "${last.label}" is cut off (bottom ${Math.round(last.bottom)} of ${LANDSCAPE.height - INSETS.bottom})`,
    );
  }
};

void runScenario({
  drive: {
    media: { [soprano.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [soprano] },
  mediaProbe: true,
  requires: ['chromium'],
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Soprano Part');
    await page.getByLabel('Soprano Part options').first().click();
    await page.getByText('Sheet music', { exact: true }).last().click();
    await page.getByText('View', { exact: true }).first().click();
    await page.getByLabel('Close sheet music').waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Go to page', { exact: true }).waitFor({
      timeout: WAIT_MS,
    });
    // An iPhone on its side: Dynamic Island and home indicator insets.
    await emulateInsets(page);
    await settledBox(page.getByLabel('Close sheet music'));
    await shot('1-rail-default');
    await expectRailInWindow(page, 'the default layout');

    // Pages turns whole pages, so the rail also holds the two step buttons.
    await page.getByLabel('Layout', { exact: true }).click();
    await page.getByText('Pages', { exact: true }).click();
    await page.getByRole('button', { name: 'Done' }).last().click();
    await page.getByLabel('Next page').waitFor({ timeout: WAIT_MS });
    await settledBox(page.getByLabel('Next page'));
    await shot('2-rail-pages');
    await expectRailInWindow(page, 'the Pages layout');
    pass(
      'The rail fits above the home indicator, with and without the page steps',
    );
  },
  viewport: LANDSCAPE,
  webFiles: {
    [SCORE_URL]: {
      body: readFileSync(SCORE_FIXTURE),
      contentType: 'application/pdf',
    },
  },
});
