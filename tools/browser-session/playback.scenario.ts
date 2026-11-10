import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Playback: play, pause, resume, seek, the queue (next, previous, reorder,
// ordered and shuffle), and the speed and pitch controls. What the player is
// really doing is read off its media element, so a readout that says 0.5x
// while the engine runs at 1x fails.
const WAIT_MS = 5000;
const TONE_SECONDS = 30;
const SPEED_STEP_PRESSES = 10; // 0.05 each: 1.00x down to 0.50x
const SEEK_SECONDS = 15;
const SEEK_TOLERANCE_S = 3;
const RATE_WINDOW_MS = 2000;
const RATE_TOLERANCE = 0.25;

const names = ['Alto Part', 'Soprano Part', 'Tenor Part'];
const sources = names.map((name) =>
  buildMockSource(name, { durationMs: TONE_SECONDS * 1000 }),
);
const tone = buildToneMedia({ seconds: TONE_SECONDS });

const playing = (page: Page) =>
  waitUntil(async () => {
    const state = await readMediaState(page);

    return state !== null && !state.paused && state.currentTime > 0;
  }, 'the player did not start playing');

const rowTop = async (page: Page, label: string) =>
  (await page.getByLabel(label).boundingBox())?.y ?? NaN;

void runScenario({
  drive: {
    media: Object.fromEntries(
      sources.map(({ driveFileId }) => [driveFileId, tone]),
    ),
    state: 'authorized',
  },
  library: { playlists: [], sources },
  mediaProbe: true,
  steps: async ({ page, pass, shot }) => {
    const miniPlayer = () => page.getByLabel(/^Now playing:/);

    await waitForTrack(page, 'Alto Part');
    await page.getByText('Tracks', { exact: true }).first().click();
    await page.getByText('Play all', { exact: true }).click();
    await page
      .getByText('Playing · Current queue · 1 of 3')
      .first()
      .waitFor({ timeout: WAIT_MS });
    await playing(page);
    pass('Play all starts the queue at the first track');

    // Pause and resume.
    await page.getByLabel('Pause Alto Part').click();
    await waitUntil(
      async () => (await readMediaState(page))?.paused === true,
      'Pause did not pause the player',
    );
    const pausedAt = (await readMediaState(page))?.currentTime ?? 0;

    await page.getByLabel('Resume Alto Part').click();
    await waitUntil(
      async () => (await readMediaState(page))?.paused === false,
      'Play did not resume the player',
    );
    if (((await readMediaState(page))?.currentTime ?? 0) < pausedAt - 0.5) {
      throw new Error('Resume restarted the track instead of continuing');
    }

    pass('Pause stops the player and resume continues from the same place');

    // Seek with the 15-second buttons in the playback sheet.
    await miniPlayer().click();
    await page.getByLabel('Forward 15 seconds').waitFor({ timeout: WAIT_MS });
    const before = (await readMediaState(page))?.currentTime ?? 0;

    await page.getByLabel('Forward 15 seconds').click();
    await waitUntil(async () => {
      const at = (await readMediaState(page))?.currentTime ?? 0;

      return Math.abs(at - (before + SEEK_SECONDS)) < SEEK_TOLERANCE_S;
    }, 'Forward 15 seconds did not move the player about 15 s on');
    await page.getByLabel('Back 15 seconds').click();
    await waitUntil(async () => {
      const at = (await readMediaState(page))?.currentTime ?? 0;

      return at < before + SEEK_TOLERANCE_S;
    }, 'Back 15 seconds did not move the player back');
    await shot('1-sheet');
    pass('Forward and Back 15 seconds seek the player');

    // Next and previous in the queue.
    await page.getByLabel('Next queue item').click();
    await page
      .getByText(/Current queue · 2 of 3/)
      .first()
      .waitFor({ timeout: WAIT_MS });
    await playing(page);
    await page.getByLabel('Previous queue item').click();
    await page
      .getByText(/Current queue · 1 of 3/)
      .first()
      .waitFor({ timeout: WAIT_MS });
    pass('Next and Previous step through the queue');

    // The queue: reorder, and switch to shuffle and back.
    await page.getByLabel('Show queue').click();
    await page
      .getByText('3 items · 1:30 · ordered')
      .waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Move Tenor Part up').click();
    await waitUntil(
      async () =>
        (await rowTop(page, 'Drag Tenor Part to reorder')) <
        (await rowTop(page, 'Drag Soprano Part to reorder')),
      'Move up did not reorder the queue',
    );
    await shot('2-queue-reordered');
    pass('Move up reorders the queue');

    await page.getByText('Shuffle', { exact: true }).last().click();
    await page
      .getByText('3 items · 1:30 · shuffle')
      .waitFor({ timeout: WAIT_MS });
    await page.getByText('Ordered', { exact: true }).last().click();
    await page
      .getByText('3 items · 1:30 · ordered')
      .waitFor({ timeout: WAIT_MS });
    pass('The queue switches between shuffle and ordered');
    await page.getByLabel('Dismiss queue').click();
    // Closing the queue closes the playback sheet too; open it again.
    await miniPlayer().click();

    // Speed and pitch: the readout, the engine and the wall clock agree.
    await page.getByLabel('Speed 1.00×. Open speed and pitch').click();
    await page.getByLabel('Speed', { exact: true }).focus();
    for (let press = 0; press < SPEED_STEP_PRESSES; press += 1) {
      await page.keyboard.press('ArrowLeft');
    }

    await page.getByLabel('Speed 0.50×').waitFor({ timeout: WAIT_MS });
    await waitUntil(
      async () => (await readMediaState(page))?.playbackRate === 0.5,
      'the player is not running at the 0.50× the readout shows',
    );
    const started = (await readMediaState(page))?.currentTime ?? 0;

    await page.waitForTimeout(RATE_WINDOW_MS);

    const advanced = ((await readMediaState(page))?.currentTime ?? 0) - started;
    const expected = (RATE_WINDOW_MS / 1000) * 0.5;

    if (Math.abs(advanced - expected) > RATE_TOLERANCE) {
      throw new Error(
        `at 0.50× the audio moved ${advanced.toFixed(2)} s in 2 s, not ${expected}`,
      );
    }

    await shot('3-half-speed');
    pass('At 0.50× the readout, the player rate and the audio clock agree');

    await page.getByLabel('Raise pitch by one semitone').click();
    await page.getByLabel('Raise pitch by one semitone').click();
    await page.getByLabel('Pitch +2 st').waitFor({ timeout: WAIT_MS });
    pass('Raise pitch shows +2 st');

    await page.getByLabel('Reset speed and pitch').click();
    await page.getByLabel('Speed 1.00×').waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Pitch 0 st').waitFor({ timeout: WAIT_MS });
    await waitUntil(
      async () => (await readMediaState(page))?.playbackRate === 1,
      'Reset did not return the player to normal speed',
    );
    pass(
      'Reset returns speed and pitch to normal, in the readout and the player',
    );
  },
});
