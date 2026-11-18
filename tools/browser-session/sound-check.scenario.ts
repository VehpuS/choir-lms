import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// The experimental Sound check in Settings > Microphone: a test sound through
// Web Audio or a media element, the microphone, and the audio session type,
// each on its own, with a readout of what the page sees. Used on a phone to
// find what makes Bluetooth earbuds sound thin; here it is checked that each
// switch does what it says and that closing the page leaves nothing running.
const WAIT_MS = 8000;
const alto = buildMockSource('Alto Part');

// Plain script text: Chromium has no audio session, so give the page one that
// behaves like Safari's (a settable `type`).
const AUDIO_SESSION_STUB = `
  (() => {
    const session = { type: 'auto' };
    Object.defineProperty(navigator, 'audioSession', { configurable: true, get: () => session });
  })();
`;

const switchState = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).getAttribute('aria-checked');

const readoutText = (page: Page) =>
  page.getByLabel('Sound check readout').innerText();

const openSoundCheck = async (page: Page) => {
  await page.getByLabel('Open Drive session menu').first().click();
  await page.getByText('Settings', { exact: true }).click();
  await page.getByText('Microphone', { exact: true }).first().click();
  await page
    .getByText('Sound check', { exact: true })
    .waitFor({ timeout: WAIT_MS });
};

void runScenario({
  library: { playlists: [], sources: [alto] },
  microphone: true,
  microphoneChoice: 'automatic',
  requires: ['chromium'],
  steps: async ({ page, pass, shot }) => {
    await page.addInitScript(AUDIO_SESSION_STUB);
    await page.reload();
    await waitForTrack(page, 'Alto Part').catch(() => undefined);
    await openSoundCheck(page);
    await shot('1-sound-check');
    await waitUntil(
      async () =>
        (await readoutText(page)).includes('Track player: media element') &&
        (await readoutText(page)).includes(
          'Listening rule: microphone no, recording tool no, app hidden no',
        ),
      'the readout does not say where the track plays and what the rule reads',
    );
    pass(
      'Settings > Microphone has a Sound check with its switches and readout',
    );

    // A test sound through Web Audio in a new context.
    await page.getByLabel('Test sound: web audio, new context').click();
    await waitUntil(
      async () =>
        (await switchState(page, 'Test sound: web audio, new context')) ===
        'true',
      'the Web Audio test sound did not switch on',
    );
    await waitUntil(
      async () =>
        /Test audio context: running, \d+ Hz/.test(await readoutText(page)),
      'the readout does not show the test context running',
    );
    pass(
      'The Web Audio test sound plays in its own context and the readout says so',
    );

    // The app's own context: created on first use, and left running.
    await page.getByLabel('Test sound: web audio, the app’s context').click();
    await waitUntil(
      async () =>
        /App audio context: running, \d+ Hz/.test(await readoutText(page)),
      'the readout does not show the app context running',
    );
    pass('The app’s own audio context can play it and is read out');

    // A media element.
    await page.getByLabel('Test sound: media element').click();
    await waitUntil(
      async () =>
        (await readoutText(page)).includes('Media element sound: playing'),
      'the media element test sound did not play',
    );
    pass('The media element test sound plays');

    // The microphone, through the app's shared capture.
    await page.getByRole('switch', { name: 'Microphone', exact: true }).click();
    await waitUntil(
      async () => (await readoutText(page)).includes('Microphone open: yes'),
      'the microphone did not open',
    );
    await waitUntil(
      async () =>
        /Capture: \d+ Hz, level (-?\d+ dB|silent)/.test(
          await readoutText(page),
        ),
      'the readout shows no capture',
    );
    await waitUntil(
      async () =>
        (await readoutText(page)).includes('Listening rule: microphone yes'),
      'the listening rule did not see the microphone open',
    );
    pass(
      'The microphone opens through the shared capture and reports its rate and level',
    );

    // The app puts the session in play-and-record while it listens, and the
    // buttons can set it to anything else.
    await waitUntil(
      async () =>
        (await readoutText(page)).includes('Session type: play-and-record'),
      'the session was not play-and-record while the microphone was open',
    );
    await page.getByLabel('Session: playback').click();
    await waitUntil(
      async () => (await readoutText(page)).includes('Session type: playback'),
      'the session type did not change to playback',
    );
    pass('The session type follows the microphone and the buttons set it');

    await page.getByRole('switch', { name: 'Microphone', exact: true }).click();
    await waitUntil(
      async () => (await readoutText(page)).includes('Microphone open: no'),
      'the microphone did not close',
    );
    pass('Switching the microphone off closes it');

    // Closing Settings leaves nothing running.
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await waitUntil(
      async () =>
        (await page.getByText('Sound check', { exact: true }).count()) === 0,
      'Settings did not close',
    );
    await openSoundCheck(page);
    await waitUntil(
      async () =>
        (await readoutText(page)).includes('Media element sound: off') &&
        (await readoutText(page)).includes('Test audio context: none'),
      'a test sound was still running after Settings closed',
    );
    pass('Closing Settings stops every sound and the microphone');
  },
});
