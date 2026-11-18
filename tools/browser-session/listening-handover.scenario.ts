import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Turning pitch detection on or off while a track plays moves the track
// between the media element and the Web Audio engine, at its position and in
// the same playing or paused state, without restarting it. Opening the
// Recording tool moves it back to the media element, which recording follows.
const WAIT_MS = 8000;
const TONE_SECONDS = 60;
/** How far the position may be from where it was, across a switch. */
const SWITCH_TOLERANCE_S = 3;
// The sheet's time remaining (`−0:29`); a plain `0:30` also matches track rows.
const REMAINING = /^[-−]\d+:\d\d$/;

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

const setTool = async (page: Page, name: string, state: 'on' | 'off') => {
  await page.getByLabel('Playback practice tools').click();
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

const mediaElementPlaying = async (page: Page) => {
  const state = await readMediaState(page);

  return state !== null && !state.paused;
};

const expectNear = (what: string, actual: number, expected: number) => {
  if (actual < expected - 1 || actual > expected + SWITCH_TOLERANCE_S) {
    throw new Error(`${what}: at ${actual} s, expected about ${expected} s`);
  }
};

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  microphone: true,
  requires: ['chromium'],
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await page.getByText('Tracks', { exact: true }).first().click();
    await page.getByText('Play all', { exact: true }).click();
    await waitUntil(
      () => mediaElementPlaying(page),
      'the track did not start on the media element',
    );
    await page.getByLabel(/^Now playing:/).click();
    await page.getByLabel('Forward 15 seconds').waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Forward 15 seconds').click();
    await waitUntil(
      async () => (await elapsedSeconds(page)) >= 15,
      'the track did not seek forward',
    );
    pass('Without a microphone the track plays on the media element');

    // Listening on: the track moves to the engine where it is.
    const beforeOn = await elapsedSeconds(page);

    await setTool(page, 'Pitch detection', 'on');
    await waitUntil(
      async () => !(await mediaElementPlaying(page)),
      'the media element kept playing after pitch detection turned on',
    );
    await waitUntil(
      async () => (await elapsedSeconds(page)) > beforeOn,
      'the track did not go on playing after moving to the engine',
    );
    expectNear(
      'after moving to the engine',
      await elapsedSeconds(page),
      beforeOn,
    );
    await page
      .getByLabel('Pause Alto Part')
      .last()
      .waitFor({ timeout: WAIT_MS });
    await shot('1-on-engine');
    pass(
      'Turning pitch detection on moves the playing track to the engine in place',
    );

    // Listening off: back to the media element where it is.
    const beforeOff = await elapsedSeconds(page);

    await setTool(page, 'Pitch detection', 'off');
    await waitUntil(
      () => mediaElementPlaying(page),
      'the media element did not take the track back',
    );
    expectNear(
      'after moving back to the media element',
      (await readMediaState(page))?.currentTime ?? -1,
      beforeOff,
    );
    pass(
      'Turning pitch detection off moves it back to the media element in place',
    );

    // A paused track switches silently and stays paused.
    await page.getByLabel('Pause Alto Part').last().click();
    await page
      .getByLabel('Resume Alto Part')
      .last()
      .waitFor({ timeout: WAIT_MS });
    const pausedAt = await elapsedSeconds(page);

    await setTool(page, 'Pitch detection', 'on');
    await page.waitForTimeout(1500);

    if (await mediaElementPlaying(page)) {
      throw new Error('a paused track started on the media element');
    }

    await page
      .getByLabel('Resume Alto Part')
      .last()
      .waitFor({ timeout: WAIT_MS });
    expectNear(
      'a paused track after the switch',
      await elapsedSeconds(page),
      pausedAt,
    );

    // Resuming now plays on the engine.
    await page.getByLabel('Resume Alto Part').last().click();
    await waitUntil(
      async () => (await elapsedSeconds(page)) > pausedAt,
      'the paused track did not resume after the switch',
    );

    if (await mediaElementPlaying(page)) {
      throw new Error('the resumed track plays on the media element');
    }

    pass('A paused track switches without starting, and resumes on the engine');

    // Opening the Recording tool hands the track back: recording follows the
    // media element's clock.
    const beforeRecording = await elapsedSeconds(page);

    await setTool(page, 'Recording', 'on');
    await waitUntil(
      () => mediaElementPlaying(page),
      'opening the Recording tool did not move the track to the media element',
    );
    expectNear(
      'after opening the Recording tool',
      (await readMediaState(page))?.currentTime ?? -1,
      beforeRecording,
    );
    await shot('2-recording-tool-open');
    pass(
      'Opening the Recording tool moves the track back to the media element',
    );
  },
});
