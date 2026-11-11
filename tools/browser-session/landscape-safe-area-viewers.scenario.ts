import { readFileSync } from 'node:fs';
import type { Page } from 'playwright';

import {
  buildMockLyrics,
  withMockPlaylistItems,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import {
  buildMockPdfSheetMusic,
  buildMockPlaylist,
  buildMockSource,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { emulateInsets, expectClear, LANDSCAPE } from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// Issue #46: the full-screen viewers (lyrics reading mode, sheet music, the
// full Pitch view) and the queue's Move to position dialog are Modals of their
// own, outside the shell's padding. With the Dynamic Island on one side their
// buttons must stay clear of the insets, as must the playlist's removal
// snackbar, which is a Modal too. See safe-area-helpers.ts.
const TONE_SECONDS = 30;
const WAIT_MS = 5000;
const SHORT_WAIT_MS = 1000;
const SCORE_URL = 'https://mock-scores.test/soprano.pdf';
const SCORE_FIXTURE =
  'packages/mobile-rehearsal-player/src/test-support/fixtures/snow-soprano-four-pages.pdf';

const soprano = buildMockSource('Soprano Part', {
  durationMs: TONE_SECONDS * 1000,
  lyrics: buildMockLyrics('Kyrie eleison\nChriste eleison'),
  sheetMusic: [buildMockPdfSheetMusic('Soprano score', SCORE_URL)],
});
const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });
const tenor = buildMockSource('Tenor Part', {
  durationMs: TONE_SECONDS * 1000,
});
const sundaySet = withMockPlaylistItems(buildMockPlaylist('Sunday Set'), [
  { source: alto },
  { source: soprano },
]);
const tone = buildToneMedia({ seconds: TONE_SECONDS });

const isPlaying = (page: Page) =>
  waitUntil(async () => {
    const state = await readMediaState(page);

    return state !== null && !state.paused;
  }, 'the track did not start playing');

const startOver = async (page: Page) => {
  await page.reload();
  await waitForTrack(page, 'Alto Part');
  await emulateInsets(page);
};

void runScenario({
  drive: {
    media: Object.fromEntries(
      [soprano, alto, tenor].map((source) => [source.driveFileId, tone]),
    ),
    state: 'authorized',
  },
  library: { playlists: [sundaySet], sources: [soprano, alto, tenor] },
  mediaProbe: true,
  microphone: true,
  requires: ['chromium'],
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await emulateInsets(page);

    // Lyrics reading mode, opened from the playback sheet.
    await page.getByLabel('Play Soprano Part').first().click();
    await isPlaying(page);
    await page.getByLabel(/^Now playing:/).click();
    await page.getByText('View', { exact: true }).click();
    await page.getByLabel('Close lyrics').waitFor({ timeout: WAIT_MS });
    await shot('1-lyrics-reading');
    await expectClear(
      page.getByLabel('Close lyrics'),
      'the Close lyrics button',
    );
    await expectClear(
      page.getByLabel('Pause', { exact: true }),
      'the lyrics Pause button',
    );
    pass('Lyrics reading mode keeps its controls clear of the insets');

    // Sheet music viewer.
    await startOver(page);
    await page.getByLabel('Soprano Part options').first().click();
    await page.getByText('Sheet music', { exact: true }).last().click();
    await page.getByText('View', { exact: true }).first().click();
    await page.getByLabel('Close sheet music').waitFor({ timeout: WAIT_MS });
    await shot('2-sheet-music');
    await expectClear(
      page.getByLabel('Close sheet music'),
      'the Close sheet music button',
    );
    pass('The sheet music viewer keeps its controls clear of the insets');

    // Move to position dialog, from the queue.
    await startOver(page);
    await page.getByText('Tracks', { exact: true }).first().click();
    await page.getByText('Play all', { exact: true }).click();
    await isPlaying(page);
    await page.getByLabel(/^Now playing:/).click();
    await page.getByRole('button', { exact: true, name: 'Queue' }).click();
    await page.getByLabel('More actions for Tenor Part').click();
    await page.getByText('Move to position', { exact: true }).last().click();
    await page
      .getByText('Choose a new queue position', { exact: false })
      .waitFor({ timeout: WAIT_MS });
    await shot('3-move-to-position');
    await expectClear(
      page.getByText('Cancel', { exact: true }).last(),
      'the Move to position Cancel button',
    );
    pass('The Move to position dialog keeps its buttons clear of the insets');

    // The snackbar after removing a playlist item.
    await startOver(page);
    await page.getByText('Playlists', { exact: true }).first().click();
    await page.getByText('Sunday Set', { exact: true }).first().click();
    // A short window shows only the playlist's header: scroll to the items.
    await page.mouse.move(LANDSCAPE.width / 2, LANDSCAPE.height / 2);
    await page.mouse.wheel(0, LANDSCAPE.height);
    await page
      .locator('[aria-label="More actions for Soprano Part"]:visible')
      .click({ timeout: WAIT_MS });
    await page.getByText('Remove from playlist', { exact: true }).click();
    await page.getByText('Remove item', { exact: true }).click();
    await page.getByText('Undo', { exact: true }).waitFor({ timeout: WAIT_MS });
    await shot('4-removal-snackbar');
    await expectClear(
      page.getByText('Undo', { exact: true }),
      'the Undo button',
    );
    pass('The removal snackbar keeps its Undo button clear of the insets');

    // The full Pitch view.
    await startOver(page);
    await page.getByLabel('Practice tools', { exact: true }).click();
    await page.getByLabel('Pitch detection, off').click();
    await page.getByLabel('Pitch detection, on').waitFor({ timeout: WAIT_MS });
    await page
      .getByText('Got it', { exact: true })
      .click({ timeout: SHORT_WAIT_MS })
      .catch(() => undefined);
    await page.getByLabel('Close practice tools').first().click();
    await page.getByLabel('Open full view').click();
    await page.getByLabel('Back to monitor').waitFor({ timeout: WAIT_MS });
    await shot('5-pitch-full-view');
    await expectClear(
      page.getByLabel('Back to monitor'),
      'the Back to monitor button',
    );
    await expectClear(
      page.getByLabel('Pitch settings'),
      'the Pitch settings button',
    );
    pass('The full Pitch view keeps its controls clear of the insets');
  },
  viewport: LANDSCAPE,
  webFiles: {
    [SCORE_URL]: {
      body: readFileSync(SCORE_FIXTURE),
      contentType: 'application/pdf',
    },
  },
});
