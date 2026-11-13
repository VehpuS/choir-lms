import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack } from './page-helpers';
import { C4_HZ, expectTone, holdKey, openPiano } from './piano-helpers';
import { runScenario } from './scenario-runner';

// The first key on a fresh launch of the app, when the 21 piano recordings are
// still on their way (nothing cached, a slow network). A key pressed meanwhile
// must still be heard: before this was fixed a press that waited more than
// 1.5 s for the recordings was thrown away, so the first notes were silent.
const SLOW_SAMPLE_MS = 4000;
const SAMPLE_COUNT = 21;
const alto = buildMockSource('Alto Part');

void runScenario({
  audioTap: true,
  library: { playlists: [], sources: [alto] },
  requires: ['chromium', 'firefox'],
  steps: async ({ page, pass, session }) => {
    const sampleRequests: string[] = [];

    page.on('request', (request) => {
      if (/\.mp3(\?|$)/.test(request.url())) {
        sampleRequests.push(request.url());
      }
    });
    // Every recording takes SLOW_SAMPLE_MS to arrive.
    await page.route(/\.mp3(\?|$)/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SLOW_SAMPLE_MS));
      await route.continue();
    });

    // A fresh launch under the slow network: the app starts (and begins its
    // background fetch of the recordings) with every recording already slow.
    await page.reload();
    await waitForTrack(page, 'Alto Part').catch(() => undefined);
    await openPiano(page);

    // Pressed while they are still on their way.
    await holdKey(page, session, 'C4', async () => undefined);
    await expectTone(session, C4_HZ, 'a key pressed while the recordings load');
    pass('A key pressed while the recordings load is heard at once');

    // And once they have arrived the recorded piano plays the same key.
    await page.waitForTimeout(SLOW_SAMPLE_MS + 1000);
    assert.ok(sampleRequests.length >= SAMPLE_COUNT);
    await holdKey(page, session, 'C4', async () => undefined);
    await expectTone(
      session,
      C4_HZ,
      'a key pressed after the recordings loaded',
    );
    pass('The same key plays after the recordings have loaded');
  },
});
