import { readFileSync } from 'node:fs';
import type { Page } from 'playwright';

import { buildMockLyrics } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import {
  buildMockPdfSheetMusic,
  buildMockSource,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { LANDSCAPE, settledBox } from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// Issue #46, Part 2 (task 3.6): in the wide-short layout the sheet music and
// lyrics viewers keep the window's height for what they show. Lyrics reading
// mode puts its text size, play / pause and close in one row so the text starts
// near the top; the sheet music viewer's piano is the 138-point compact bar
// (no Full screen there) and its pitch strip a slim 48-point row, so the score
// keeps a usable page with both open. Upright is unchanged.
const PORTRAIT = { height: 844, width: 390 };
const TONE_SECONDS = 30;
const WAIT_MS = 5000;
const SCORE_URL = 'https://mock-scores.test/soprano.pdf';
const SCORE_FIXTURE =
  'packages/mobile-rehearsal-player/src/test-support/fixtures/snow-soprano-four-pages.pdf';
const LYRICS_TEXT_MAX_TOP = 90;
const HEADER_ROW_MAX_BOTTOM = 70;
const SCORE_MIN_HEIGHT = 140;
const SCORE_TOP = 40;
const PIANO_KEYS_HEIGHT = 104;
const TOLERANCE = 3;

const soprano = buildMockSource('Soprano Part', {
  durationMs: TONE_SECONDS * 1000,
  lyrics: buildMockLyrics('Kyrie eleison\nChriste eleison'),
  sheetMusic: [buildMockPdfSheetMusic('Soprano score', SCORE_URL)],
});

const boxOf = async (target: ReturnType<Page['locator']>, name: string) => {
  const box = await settledBox(target);

  if (!box) {
    throw new Error(`${name} is not on screen`);
  }

  return box;
};

void runScenario({
  drive: {
    media: { [soprano.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [soprano] },
  mediaProbe: true,
  microphone: true,
  requires: ['chromium'],
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Soprano Part');

    // Lyrics reading mode: one header row, the text right under it.
    await page.getByLabel('Play Soprano Part').first().click();
    await waitUntil(
      async () => (await readMediaState(page))?.paused === false,
      'the track did not play',
    );
    await page.getByLabel(/^Now playing:/).click();
    await page.getByText('View', { exact: true }).click();
    await page.getByLabel('Close lyrics').waitFor({ timeout: WAIT_MS });

    const size = await boxOf(
      page.getByLabel('Lyrics text size'),
      'the text size',
    );
    const pause = await boxOf(
      page.getByLabel('Pause', { exact: true }),
      'Pause',
    );
    const text = await boxOf(page.getByText(/^Kyrie eleison/), 'the lyrics');

    await shot('1-lyrics');

    if (
      size.y + size.height > HEADER_ROW_MAX_BOTTOM ||
      pause.y + pause.height > HEADER_ROW_MAX_BOTTOM ||
      text.y > LYRICS_TEXT_MAX_TOP
    ) {
      throw new Error(
        `lyrics reading mode wastes height (size ends ${Math.round(size.y + size.height)}, pause ends ${Math.round(pause.y + pause.height)}, text starts ${Math.round(text.y)})`,
      );
    }

    pass('Lyrics reading mode keeps its controls in one row and the text high');

    // Upright keeps the text size control on its own row below the title.
    await page.setViewportSize(PORTRAIT);
    await page.getByLabel('Lyrics text size').waitFor({ timeout: WAIT_MS });
    const upright = await boxOf(
      page.getByLabel('Lyrics text size'),
      'the text size',
    );
    const close = await boxOf(page.getByLabel('Close lyrics'), 'Close lyrics');

    if (upright.y < close.y + close.height) {
      throw new Error('upright lyrics reading mode lost its own size row');
    }

    await page.setViewportSize(LANDSCAPE);
    // Reading mode opened from the playback view; start the next part clean.
    await page.reload();
    await waitForTrack(page, 'Soprano Part');
    pass('Upright keeps the size control on its own row');

    // Sheet music viewer with the piano and the pitch monitor on.
    await page.getByLabel('Soprano Part options').first().click();
    await page.getByText('Sheet music', { exact: true }).last().click();
    await page.getByText('View', { exact: true }).first().click();
    await page.getByLabel('Close sheet music').waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Practice tools', { exact: true }).last().click();
    await page.getByLabel('Piano, off').click();
    await page.getByLabel('Pitch detection, off').click();
    await page.getByLabel('Close practice tools').first().click();
    await page.getByLabel('Pitch monitor').waitFor({ timeout: WAIT_MS });
    await shot('2-score-with-tools');

    const monitor = await boxOf(
      page.getByLabel('Pitch monitor'),
      'the pitch monitor',
    );
    const keys = await boxOf(
      page.getByTestId('piano-keyboard'),
      'the keyboard',
    );

    if (monitor.y - SCORE_TOP < SCORE_MIN_HEIGHT) {
      throw new Error(
        `the score has only ${Math.round(monitor.y - SCORE_TOP)} points above the tools`,
      );
    }

    if (Math.abs(keys.height - PIANO_KEYS_HEIGHT) > TOLERANCE) {
      throw new Error(
        `the viewer's keyboard is ${Math.round(keys.height)} high`,
      );
    }

    if ((await page.getByLabel('Full screen').count()) !== 0) {
      throw new Error('the viewer offers piano full screen');
    }

    pass('With the piano and pitch on, the score keeps at least 140 points');

    // Upright keeps the docked piano with its grabber.
    await page.setViewportSize(PORTRAIT);
    await page.getByLabel('Piano height').waitFor({ timeout: WAIT_MS });
    pass('Upright keeps the docked piano in the viewer');
  },
  viewport: LANDSCAPE,
  webFiles: {
    [SCORE_URL]: {
      body: readFileSync(SCORE_FIXTURE),
      contentType: 'application/pdf',
    },
  },
});
