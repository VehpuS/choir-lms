import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack, waitUntil } from './page-helpers';
import {
  C4_HZ,
  WAIT_MS,
  expectTone,
  holdKey,
  openPiano,
} from './piano-helpers';
import { runScenario } from './scenario-runner';

// Pitch detection and the piano open together, as in the home-screen app on an
// iPhone. The piano asks for the `playback` audio session so it is audible with
// the silent switch on; on iOS that session type has no microphone input, so a
// page that keeps it while it listens gets "No microphone found". The page gets
// a stand-in for that: while the session type is `playback`, a new capture
// fails with NotFoundError and a running one is cut. The page must ask for
// `play-and-record`, the type for playing and capturing at once, while the
// microphone is open, and the piano must still be heard then. Both orders are
// covered.
const alto = buildMockSource('Alto Part');

// Plain script text: it runs in the page, where the test tooling's helpers do not exist.
const IOS_AUDIO_SESSION = `
  (() => {
    let type = 'auto';
    const live = new Set();
    const cutCaptures = () => {
      live.forEach((track) => {
        track.stop();
        track.dispatchEvent(new Event('ended'));
      });
      live.clear();
    };
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: {
        get type() { return type; },
        set type(next) {
          type = next;
          if (next === 'playback') cutCaptures();
        },
      },
    });
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (constraints && constraints.audio && type === 'playback') {
        throw new DOMException('Requested device not found', 'NotFoundError');
      }
      const stream = await getUserMedia(constraints);
      stream.getAudioTracks().forEach((track) => live.add(track));
      return stream;
    };
  })();
`;

const turnToolOn = async (page: import('playwright').Page, name: string) => {
  await page.getByLabel('Practice tools', { exact: true }).click();
  await page.getByLabel(`${name}, off`).click();
  await page.getByLabel(`${name}, on`).waitFor({ timeout: WAIT_MS });
  await page.getByLabel('Close practice tools').first().click();
};

void runScenario({
  audioTap: true,
  library: { playlists: [], sources: [alto] },
  microphone: true,
  requires: ['chromium'],
  steps: async ({ page, pass, session }) => {
    await page.addInitScript(IOS_AUDIO_SESSION);
    await page.reload();
    await waitForTrack(page, 'Alto Part').catch(() => undefined);

    const noMicrophone = page.getByText('No microphone found.', {
      exact: false,
    });
    const listening = page.getByText('Listening', { exact: false }).first();

    // Piano first, then pitch detection.
    await openPiano(page);
    await turnToolOn(page, 'Pitch detection');
    await waitUntil(
      async () => (await listening.count()) + (await noMicrophone.count()) > 0,
      'pitch detection showed neither "Listening" nor an error',
    );
    assert.equal(
      await noMicrophone.count(),
      0,
      'pitch detection said "No microphone found" with the piano open',
    );
    await listening.waitFor({ timeout: WAIT_MS });
    pass('Pitch detection listens while the piano is open');

    // Playing and capturing at once: the type is play-and-record, and the piano
    // is still heard while the microphone listens.
    assert.equal(
      await page.evaluate<string>('navigator.audioSession.type'),
      'play-and-record',
      'the page did not ask for play-and-record while the microphone is open',
    );
    await holdKey(page, session, 'C4', async () => undefined);
    await expectTone(session, C4_HZ, 'the piano while the microphone is open');
    pass('The piano is heard while the microphone is open (play-and-record)');

    // The capture survives for as long as the piano stays open.
    await page.waitForTimeout(1500);
    assert.equal(await noMicrophone.count(), 0);
    await listening.waitFor({ timeout: WAIT_MS });
    pass('The microphone is not cut off while both are open');

    // The microphone closes while the piano stays open: back to playback.
    await page.getByLabel('Practice tools', { exact: true }).click();
    await page.getByLabel('Pitch detection, on').click();
    await page.getByLabel('Pitch detection, off').waitFor({ timeout: WAIT_MS });
    await waitUntil(
      async () =>
        (await page.evaluate<string>('navigator.audioSession.type')) ===
        'playback',
      'closing the microphone with the piano still open did not bring back playback',
    );
    pass('Closing the microphone with the piano open brings back playback');

    // Both off, then the other order: pitch detection first, then the piano.
    await page.getByLabel('Piano, on').click();
    await page.getByLabel('Piano, off').waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Close practice tools').first().click();

    await turnToolOn(page, 'Pitch detection');
    await listening.waitFor({ timeout: WAIT_MS });
    await turnToolOn(page, 'Piano');
    await page.waitForTimeout(1500);
    await waitUntil(
      async () => (await noMicrophone.count()) === 0,
      'opening the piano while listening cut the microphone ("No microphone found")',
    );
    await listening.waitFor({ timeout: WAIT_MS });
    pass(
      'Opening the piano while pitch detection listens keeps the microphone',
    );
  },
});
