import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { visibleText, waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// While a microphone is open a track plays through the Web Audio engine, not a
// media element (a playing media element is what thins Bluetooth output on an
// iPhone while the app listens). CI cannot hear Bluetooth, so this checks the
// mechanism: with pitch detection on, no media element plays, and the track
// still pauses, seeks, changes speed and pitch and steps through the queue.
// The audio prepared for it shows in Offline files and goes with Clear all.
const WAIT_MS = 8000;
const TONE_SECONDS = 30;
const SEEK_SECONDS = 15;
const SEEK_TOLERANCE_S = 3;
const SPEED_STEP_PRESSES = 10; // 0.05 each: 1.00x down to 0.50x
const RATE_WINDOW_MS = 4000;
const RATE_TOLERANCE_S = 1.2;
// The sheet's time remaining (`-0:29`); a plain `0:30` also matches track rows.
const REMAINING = /^[-−]\d+:\d\d$/;

const names = ['Alto Part', 'Soprano Part'];
const sources = names.map((name) =>
  buildMockSource(name, { durationMs: TONE_SECONDS * 1000 }),
);
const tone = buildToneMedia({ seconds: TONE_SECONDS });

const toolSwitch = async (page: Page, name: string, state: 'on' | 'off') => {
  await page.getByLabel('Practice tools', { exact: true }).click();
  await page.getByLabel(`${name}, ${state === 'on' ? 'off' : 'on'}`).click();
  await page.getByLabel(`${name}, ${state}`).waitFor({ timeout: WAIT_MS });
  await page
    .getByLabel('Close practice tools')
    .first()
    .click({ timeout: 2000 })
    .catch(() => undefined);
};

/** How far into the track the playback sheet says it is, in seconds. */
const elapsedSeconds = async (page: Page) => {
  const text = await page.getByText(REMAINING).last().innerText();
  const [minutes, seconds] = text.slice(1).split(':').map(Number);

  return TONE_SECONDS - (minutes * 60 + seconds);
};

/** No media element is producing sound: none was started, or it is paused. */
const noMediaElementPlaying = async (page: Page) => {
  const state = await readMediaState(page);

  return state === null || state.paused;
};

void runScenario({
  drive: {
    media: Object.fromEntries(
      sources.map(({ driveFileId }) => [driveFileId, tone]),
    ),
    state: 'authorized',
  },
  library: { playlists: [], sources },
  mediaProbe: true,
  microphone: true,
  requires: ['chromium'],
  steps: async ({ page, pass, shot }) => {
    const miniPlayer = () => page.getByLabel(/^Now playing:/);
    const expectEngineOnly = async (what: string) => {
      if (!(await noMediaElementPlaying(page))) {
        throw new Error(`a media element is playing ${what}`);
      }
    };

    await waitForTrack(page, 'Alto Part');
    await toolSwitch(page, 'Pitch detection', 'on');
    await page
      .getByText('Listening', { exact: false })
      .first()
      .waitFor({ timeout: WAIT_MS });

    // Play the queue with the microphone open.
    await page.getByText('Tracks', { exact: true }).first().click();
    await page.getByText('Play all', { exact: true }).click();
    await page
      .getByText('Playing · Current queue · 1 of 2')
      .first()
      .waitFor({ timeout: WAIT_MS });
    await miniPlayer().click();
    await page.getByLabel('Forward 15 seconds').waitFor({ timeout: WAIT_MS });
    await waitUntil(
      async () => (await elapsedSeconds(page)) >= 1,
      'the track did not advance while the microphone was open',
    );
    await expectEngineOnly('while pitch detection listens');
    await shot('1-playing-on-engine');
    pass('With pitch detection on, the track plays and no media element does');

    // No composite-only control appears for it.
    if ((await page.getByLabel(/^Mix preset:/).count()) > 0) {
      throw new Error('the Mix panel is shown for a single track');
    }

    pass('A single track on the engine shows no Mix panel');

    // Recording follows the media element's clock until it can follow the
    // engine's, so it is not offered while the engine plays.
    await page.getByLabel('Playback practice tools').click();
    await page.getByLabel('Pitch detection, on').waitFor({ timeout: WAIT_MS });

    if ((await page.getByLabel(/^Recording, /).count()) > 0) {
      throw new Error('Recording is offered while the engine plays the track');
    }

    await page.getByLabel('Close practice tools').first().click();
    pass('Recording is not offered while the engine plays the track');

    // Pause and resume keep the position.
    await page.getByLabel('Pause Alto Part').last().click();
    await page
      .getByLabel('Resume Alto Part')
      .last()
      .waitFor({ timeout: WAIT_MS });
    const pausedAt = await elapsedSeconds(page);

    await page.waitForTimeout(1500);

    if ((await elapsedSeconds(page)) > pausedAt + 1) {
      throw new Error('the track kept advancing while paused');
    }

    await page.getByLabel('Resume Alto Part').last().click();
    await page
      .getByLabel('Pause Alto Part')
      .last()
      .waitFor({ timeout: WAIT_MS });
    await waitUntil(
      async () => (await elapsedSeconds(page)) > pausedAt,
      'resume did not continue the track',
    );
    pass('Pause holds the position and resume continues from it');

    // Seek.
    const before = await elapsedSeconds(page);

    await page.getByLabel('Forward 15 seconds').click();
    await waitUntil(
      async () =>
        Math.abs((await elapsedSeconds(page)) - (before + SEEK_SECONDS)) <
        SEEK_TOLERANCE_S,
      'Forward 15 seconds did not move the track about 15 s on',
    );
    await page.getByLabel('Back 15 seconds').click();
    await waitUntil(
      async () => (await elapsedSeconds(page)) < before + SEEK_TOLERANCE_S,
      'Back 15 seconds did not move the track back',
    );
    pass('Forward and Back 15 seconds seek the track');

    // Speed: the readout and the audio clock agree.
    await page.getByLabel('Speed 1.00×. Open speed and pitch').click();
    await page.getByLabel('Speed', { exact: true }).focus();
    for (let press = 0; press < SPEED_STEP_PRESSES; press += 1) {
      await page.keyboard.press('ArrowLeft');
    }

    await page.getByLabel('Speed 0.50×').waitFor({ timeout: WAIT_MS });
    // The sheet covers the time readout, so close it to measure.
    await page.getByLabel('Close speed and pitch').click();
    const started = await elapsedSeconds(page);

    await page.waitForTimeout(RATE_WINDOW_MS);

    const advanced = (await elapsedSeconds(page)) - started;
    const expected = (RATE_WINDOW_MS / 1000) * 0.5;

    if (Math.abs(advanced - expected) > RATE_TOLERANCE_S) {
      throw new Error(
        `at 0.50× the track moved ${advanced} s in 4 s, not about ${expected}`,
      );
    }

    await page.getByLabel(/^Speed 0\.50×\. Open speed and pitch/).click();
    await page.getByLabel('Raise pitch by one semitone').click();
    await page.getByLabel('Pitch +1 st').waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Reset speed and pitch').click();
    await page.getByLabel('Speed 1.00×').waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Pitch 0 st').waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Close speed and pitch').click();
    await expectEngineOnly('after changing speed and pitch');
    await shot('2-speed-and-pitch');
    pass('Speed and pitch apply to the track, and reset returns them');

    // The queue.
    await page.getByLabel('Next queue item').click();
    await page
      .getByText(/Current queue · 2 of 2/)
      .first()
      .waitFor({ timeout: WAIT_MS });
    await page
      .getByLabel('Pause Soprano Part')
      .last()
      .waitFor({ timeout: WAIT_MS });
    await expectEngineOnly('on the next track of the queue');
    await page.getByLabel('Previous queue item').click();
    await page
      .getByText(/Current queue · 1 of 2/)
      .first()
      .waitFor({ timeout: WAIT_MS });
    await expectEngineOnly('on the previous track of the queue');
    pass(
      'Next and Previous step through the queue, still without a media element',
    );

    // The audio prepared for both tracks is listed, and Clear all removes it.
    await page.getByLabel('Pause Alto Part').last().click();
    await page.getByLabel('Dismiss playback').click();
    await page.getByLabel('Open Drive session menu').first().click();
    await page.getByText('Offline files', { exact: true }).click();
    await page
      .getByText('Prepared for listening', { exact: true })
      .waitFor({ timeout: WAIT_MS });
    await visibleText(page, 'Soprano Part').waitFor({ timeout: WAIT_MS });
    await shot('3-offline-files');
    pass('Offline files lists the audio prepared for listening');

    await page.getByText('Clear all', { exact: true }).click();
    await page
      .getByText('audio prepared for listening of 2 tracks', { exact: false })
      .waitFor({ timeout: WAIT_MS });
    await page.getByText('Clear all', { exact: true }).last().click();
    await page
      .getByText('Prepared for listening', { exact: true })
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    pass('Clear all names the prepared listening audio and removes it');
  },
});
