import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import {
  openTrackMenu,
  visibleText,
  waitForTrack,
  waitUntil,
} from './page-helpers';
import { runScenario } from './scenario-runner';

// Offline files and the Drive session: keep a track offline (it downloads
// once), play it without downloading again, see it in Offline files with its
// size, clear it, and forget the Drive session. What the mock Drive was asked
// proves the download happened (or did not).
const WAIT_MS = 5000;
const TONE_SECONDS = 10;
const AUTH_KEY = 'choirlms.google-drive.authorization';

const alto = buildMockSource('Alto Part', {
  durationMs: TONE_SECONDS * 1000,
});
// Not kept offline: playing it must download it (the control for the counter).
const tenor = buildMockSource('Tenor Part', {
  durationMs: TONE_SECONDS * 1000,
});
const media = buildToneMedia({ seconds: TONE_SECONDS });

void runScenario({
  // Needs a Blob in IndexedDB, which Playwright's WebKit (the WPE build, not
  // desktop Safari) cannot store: see `browser-capabilities`, which tells us
  // when that changes. Confirm on real Safari by hand (tasks.md follow-up F.3).
  requires: ['chromium', 'firefox'],
  drive: {
    media: { [alto.driveFileId]: media, [tenor.driveFileId]: media },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto, tenor] },
  mediaProbe: true,
  steps: async ({ page, pass, session, shot }) => {
    const downloadsOf = (fileId: string) =>
      session.drive.apiRequests.filter(
        (request) => request === `GET /drive/v3/files/${fileId}`,
      ).length;
    const downloads = () => downloadsOf(alto.driveFileId);
    const openSessionMenu = () =>
      page
        .getByLabel('Open Drive session menu')
        .filter({ visible: true })
        .click();

    await waitForTrack(page, 'Alto Part');

    // Keep it offline: one download, and the row says so.
    await openTrackMenu(page, 'Alto Part');
    await page.getByText('Keep offline', { exact: true }).click();
    await page.getByLabel('Kept offline').first().waitFor({ timeout: WAIT_MS });
    const afterKeep = downloads();

    if (afterKeep < 1) {
      throw new Error('keeping the track offline did not download it');
    }

    await shot('1-kept-offline');
    pass('Keep offline downloads the track once and marks the row');

    // Playing it uses the kept copy: no further download.
    await page.getByLabel('Play Alto Part').first().click();
    await waitUntil(async () => {
      const state = await readMediaState(page);

      return state !== null && !state.paused && state.currentTime > 0;
    }, 'the kept track did not play');
    if (downloads() !== afterKeep) {
      throw new Error('playing a kept track downloaded it again');
    }

    pass('A kept track plays without downloading it again');

    // Control: a track that was not kept is downloaded when it plays.
    await page.getByLabel('Play Tenor Part').first().click();
    await waitUntil(
      async () => downloadsOf(tenor.driveFileId) >= 1,
      'playing a track that was not kept did not download it',
    );
    pass('A track that was not kept is downloaded when it plays (the control)');

    // Offline files lists it with its size (10 s of 22.05 kHz 16-bit audio).
    await openSessionMenu();
    await page.getByText('Offline files', { exact: true }).click();
    await page.getByText('431 KB kept').waitFor({ timeout: WAIT_MS });
    await visibleText(page, 'Alto Part').waitFor({ timeout: WAIT_MS });
    await shot('2-offline-files');
    pass('Offline files lists the track with its size');

    // Clear all asks first; Cancel keeps the file, confirming removes it.
    await page.getByText('Clear all', { exact: true }).click();
    await page
      .getByText('Clear all offline files?')
      .waitFor({ timeout: WAIT_MS });
    await page.getByText('Cancel', { exact: true }).last().click();
    await page.getByText('431 KB kept').waitFor({ timeout: WAIT_MS });
    pass('Cancelling Clear all keeps the file');

    await page.getByText('Clear all', { exact: true }).click();
    await page
      .getByText('Clear all offline files?')
      .waitFor({ timeout: WAIT_MS });
    await page.getByRole('button', { name: 'Clear all' }).last().click();
    await page.getByLabel('Close offline files').click();
    await page
      .getByLabel('Kept offline')
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    pass('Confirming removes the kept copy and the row no longer says kept');

    // Forget the Drive session: signed out, and the stored sign-in is gone.
    await openSessionMenu();
    await page.getByText('Forget session', { exact: true }).click();
    await page
      .getByText('Connect Google Drive')
      .first()
      .waitFor({ timeout: WAIT_MS });
    await waitUntil(
      async () => (await session.readStored(AUTH_KEY)) === null,
      'the stored Drive sign-in is still there',
    );
    await shot('3-forgotten');
    pass('Forget session signs out and clears the stored sign-in');
  },
});
