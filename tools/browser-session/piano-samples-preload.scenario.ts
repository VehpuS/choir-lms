import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack, waitUntil } from './page-helpers';
import { WAIT_MS, openPiano } from './piano-helpers';
import { runScenario } from './scenario-runner';

// The piano's 21 recordings (0.65 MB in all) are fetched in the background
// soon after the app starts, before the piano is ever opened, and opening it
// then fetches nothing more: on a fresh launch (nothing cached, a slow
// network) a piano that only started downloading at its first key made the
// first notes late or silent.
const SAMPLE_COUNT = 21;
const alto = buildMockSource('Alto Part');

void runScenario({
  library: { playlists: [], sources: [alto] },
  requires: ['chromium', 'firefox'],
  steps: async ({ page, pass }) => {
    const sampleRequests: string[] = [];

    page.on('request', (request) => {
      if (/\.mp3(\?|$)/.test(request.url())) {
        sampleRequests.push(request.url());
      }
    });

    // A fresh launch: reload with the listener already in place.
    await page.reload();
    await waitForTrack(page, 'Alto Part').catch(() => undefined);

    await waitUntil(
      async () => sampleRequests.length >= SAMPLE_COUNT,
      `the recordings were not fetched at app start (${sampleRequests.length} of ${SAMPLE_COUNT} requested, piano never opened)`,
      WAIT_MS,
    );
    pass('The recordings are fetched at app start, before the piano is opened');

    await openPiano(page);
    await page.waitForTimeout(1000);
    assert.equal(
      sampleRequests.length,
      SAMPLE_COUNT,
      'opening the piano fetched the recordings again instead of using the warmed ones',
    );
    pass('Opening the piano fetches nothing more');
  },
});
