import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildMockPdfSheetMusic,
  buildMockSource,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { runScenario } from './scenario-runner';

// Opens a real four-page PDF as a track's sheet music, with no Google session:
// the score is a web link whose bytes the browser session serves. Usage, after
// `nx run mobile-rehearsal-player:build`:
//   npx tsx tools/browser-session/sheet-music-pdf.scenario.ts <outDir>
const WAIT_MS = 15_000;
const FIXTURE_PATH =
  'packages/mobile-rehearsal-player/src/test-support/fixtures/snow-soprano-four-pages.pdf';
const SCORE_URL = 'https://mock-scores.test/soprano.pdf';
const SCORE_LABEL = 'Soprano score';
const TRACK_NAME = 'Soprano Part';
const EXPECTED_PAGE_COUNT = 4;
// pdf.js draws page canvases lazily, so only a floor on drawn canvases is checked.
const MIN_DRAWN_CANVASES = 1;

void runScenario({
  library: {
    playlists: [],
    sources: [
      buildMockSource(TRACK_NAME, {
        sheetMusic: [buildMockPdfSheetMusic(SCORE_LABEL, SCORE_URL)],
      }),
    ],
  },
  steps: async ({ page, pass, shot }) => {
    await page.getByLabel(`${TRACK_NAME} options`).first().waitFor();

    // 1. The track menu opens the manager, which lists the linked PDF.
    await page.getByLabel(`${TRACK_NAME} options`).first().click();
    await page.getByText('Sheet music', { exact: true }).last().click();
    await page.getByText(SCORE_LABEL).first().waitFor({ timeout: WAIT_MS });
    await shot('1-manager-lists-pdf');
    pass('Sheet music manager lists the PDF assigned to the track');

    // 2. Viewing it loads the PDF through pdf.js and draws page canvases.
    await page.getByText('View', { exact: true }).first().click();
    await page.locator('canvas').first().waitFor({ timeout: WAIT_MS });
    await page.waitForTimeout(1000);
    await shot('2-pdf-rendered');
    assert.ok((await page.locator('canvas').count()) >= MIN_DRAWN_CANVASES);
    pass('PDF renders to a canvas in the viewer');

    // 3. The viewer knows the document has four pages.
    await page
      .getByText(`Page 1 of ${EXPECTED_PAGE_COUNT}`)
      .first()
      .waitFor({ timeout: WAIT_MS });
    pass(`Viewer reports a ${EXPECTED_PAGE_COUNT}-page document`);
  },
  webFiles: {
    [SCORE_URL]: {
      body: readFileSync(FIXTURE_PATH),
      contentType: 'application/pdf',
    },
  },
});
