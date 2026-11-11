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
  },
  viewport: LANDSCAPE,
});
