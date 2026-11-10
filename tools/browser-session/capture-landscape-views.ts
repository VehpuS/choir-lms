import { readFileSync } from 'node:fs';
import type { Page } from 'playwright';

import {
  buildMockComposite,
  buildMockLyrics,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import {
  buildMockPdfSheetMusic,
  buildMockSource,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { buildToneMedia } from './mock-media';
import { openTab, waitForTrack } from './page-helpers';
import { runScenario } from './scenario-runner';

// Not a test: captures the app's surfaces at a landscape phone size (844 x 390
// points) so the landscape layout (openspec/changes/landscape-mobile-layout)
// can be designed against real screens. It is named without `.scenario.` so no
// lane runs it. Usage, after `nx run mobile-rehearsal-player:build-browser-test`:
//   npx tsx tools/browser-session/capture-landscape-views.ts <outDir>
// A state that cannot be reached is logged and skipped, not failed, because a
// screen that is hard to reach in landscape is itself a finding.
const LANDSCAPE = { height: 390, width: 844 };
const SCALE = 2;
const TONE_SECONDS = 60;
const REACH_MS = 3000;
const SETTLE_MS = 700;
const PLAY_MS = 1500;
const SCORE_URL = 'https://mock-scores.test/soprano.pdf';
const SCORE_FIXTURE =
  'packages/mobile-rehearsal-player/src/test-support/fixtures/snow-soprano-four-pages.pdf';

const soprano = buildMockSource('Soprano Part', {
  durationMs: TONE_SECONDS * 1000,
  lyrics: buildMockLyrics(
    'Kyrie eleison\nChriste eleison\nKyrie eleison\nGloria in excelsis Deo',
  ),
  sheetMusic: [buildMockPdfSheetMusic('Soprano score', SCORE_URL)],
});
const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });
const tenor = buildMockSource('Tenor Part', {
  durationMs: TONE_SECONDS * 1000,
});
const kyrie = buildMockComposite('Kyrie mix', [
  { mine: true, source: soprano },
  { source: alto },
  { source: tenor },
]);
const tone = buildToneMedia({ seconds: TONE_SECONDS });

const byLabel = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).first();

void runScenario({
  deviceScaleFactor: SCALE,
  drive: {
    media: Object.fromEntries(
      [soprano, alto, tenor].map((source) => [source.driveFileId, tone]),
    ),
    state: 'authorized',
  },
  library: {
    composites: [kyrie],
    playlists: [],
    sources: [soprano, alto, tenor],
  },
  mediaProbe: true,
  microphone: true,
  requires: ['chromium'],
  steps: async ({ page, pass, shot }) => {
    const reset = async () => {
      await page.reload();
      await waitForTrack(page, 'Alto Part');
    };
    const play = async (track: string) => {
      await byLabel(page, `Play ${track}`).click({
        force: true,
        timeout: REACH_MS,
      });
      await page.waitForTimeout(PLAY_MS);
    };
    const openSheet = () =>
      page.getByLabel(/^Now playing:/).click({ timeout: REACH_MS });
    const capture = async (name: string, reach?: () => Promise<unknown>) => {
      try {
        await reach?.();
        await page.waitForTimeout(SETTLE_MS);
        await shot(name);
        pass(`captured ${name}`);
      } catch (error) {
        console.log(
          `SKIPPED ${name}: ${(error as Error).message.split('\n')[0]}`,
        );
      }
    };

    await waitForTrack(page, 'Alto Part');
    await capture('library');
    await capture('add', () => openTab(page, 'Add'));
    await capture('recents', () => openTab(page, 'Recents'));
    await capture('composites', async () => {
      await openTab(page, 'Library');
      await page.getByText('Composites', { exact: true }).first().click();
    });
    await reset();
    await capture('track-menu', () =>
      byLabel(page, 'Alto Part options').click(),
    );
    await reset();
    await capture('mini-player', () => play('Alto Part'));
    await capture('playback-sheet', openSheet);
    await capture('playback-sheet-scrolled', async () => {
      await page.mouse.move(LANDSCAPE.width / 2, LANDSCAPE.height / 2);
      await page.mouse.wheel(0, 400);
    });
    await reset();
    await capture('composite-mix', async () => {
      await page.getByText('Composites', { exact: true }).first().click();
      await page
        .getByLabel(/^Play Kyrie mix/)
        .first()
        .click({ timeout: REACH_MS });
      await page.waitForTimeout(PLAY_MS);
      await openSheet();
    });
    await reset();
    await capture('lyrics', async () => {
      await play('Soprano Part');
      await openSheet();
      await page.mouse.wheel(0, 300);
    });
    await reset();
    await capture('sheet-music', async () => {
      await byLabel(page, 'Soprano Part options').click({ force: true });
      await page.getByText('Sheet music', { exact: true }).last().click();
      await page.getByText('View', { exact: true }).first().click();
      await page
        .locator('canvas')
        .first()
        .waitFor({ timeout: REACH_MS * 5 });
    });
    // Last, because the tools stay open across a reload and cover the rest.
    await capture('piano', async () => {
      await byLabel(page, 'Practice tools').click({ timeout: REACH_MS });
      await byLabel(page, 'Piano, off').click({ timeout: REACH_MS });
      await page.keyboard.press('Escape');
    });
    await reset();
    await capture('pitch-and-piano', async () => {
      // The tools menu stays open between toggles, so both go in one visit.
      await byLabel(page, 'Practice tools').click({ timeout: REACH_MS });
      await byLabel(page, 'Pitch detection, off').click({ timeout: REACH_MS });
      await byLabel(page, 'Piano, off').click({ timeout: REACH_MS });
      await page.keyboard.press('Escape');
    });
    await reset();
  },
  viewport: LANDSCAPE,
  webFiles: {
    [SCORE_URL]: {
      body: readFileSync(SCORE_FIXTURE),
      contentType: 'application/pdf',
    },
  },
});
