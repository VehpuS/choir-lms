import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack } from './page-helpers';
import {
  C4_HZ,
  WAIT_MS,
  expectTone,
  holdKey,
  keyColor,
  openPiano,
} from './piano-helpers';
import { runScenario } from './scenario-runner';

// The piano straight after signing in: Connect completes a (mock) Google
// sign-in through the app's popup flow, and the first thing done afterwards is
// to open the piano and play a key. Signing in must not leave the piano silent
// or dead (the page's audio context and the new session both start then).
const alto = buildMockSource('Alto Part');

// Both orders: the piano opened after the sign-in, and the piano already open
// (and its audio context already made) when the sign-in happens.
const runWith = (pianoFirst: boolean) =>
  runScenario({
    audioTap: true,
    drive: { completeSignIn: true, state: 'signed-out' },
    library: { playlists: [], sources: [alto] },
    steps: async ({ page, pass, session, shot }) => {
      await waitForTrack(page, 'Alto Part').catch(() => undefined);
      await page
        .getByText('Connect Google Drive', { exact: true })
        .first()
        .waitFor({ timeout: WAIT_MS });

      if (pianoFirst) {
        await openPiano(page);
      }

      await page.getByLabel('Connect').first().click();
      // Signed in: the banner is gone and the track no longer reads unavailable.
      await page
        .getByText('Connect Google Drive', { exact: true })
        .first()
        .waitFor({ state: 'detached', timeout: WAIT_MS });
      await page
        .getByText('Track unavailable')
        .waitFor({ state: 'detached', timeout: WAIT_MS });
      assert.equal(session.drive?.signInRequests.length, 1);
      await shot('1-signed-in');
      pass(
        `Connect completes a Google sign-in and the library is available (piano ${pianoFirst ? 'open before' : 'opened after'})`,
      );

      // At once: open the piano (unless it already is) and play.
      if (!pianoFirst) {
        await openPiano(page);
      }

      const restingColor = await keyColor(page, 'C4');

      await holdKey(page, session, 'C4', async () => {
        if ((await keyColor(page, 'C4')) === restingColor) {
          throw new Error('the held key is not shown pressed');
        }
        await shot('2-key-held');
      });
      await expectTone(session, C4_HZ, 'pressing C4 right after signing in');
      pass(
        `A key pressed right after signing in lights up and plays a C4 (piano ${pianoFirst ? 'open before' : 'opened after'})`,
      );
    },
  });

void (async () => {
  await runWith(false);
  await runWith(true);
})();
