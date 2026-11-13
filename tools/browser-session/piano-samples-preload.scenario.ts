import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack, waitUntil } from './page-helpers';
import { WAIT_MS, openPiano } from './piano-helpers';
import { runScenario } from './scenario-runner';

// The piano's 21 recordings start loading when the piano opens, not at the
// first key: on a fresh launch of the app (nothing cached, a slow network) they
// take seconds to arrive, and the time between opening the piano and reaching
// for a key is the time they have to get here.
const SLOW_SAMPLE_MS = 4000;
const SAMPLE_COUNT = 21;
const alto = buildMockSource('Alto Part');

void runScenario({
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

    await waitForTrack(page, 'Alto Part').catch(() => undefined);
    await openPiano(page);

    // The recordings start loading when the piano opens, not at the first key.
    await waitUntil(
      async () => sampleRequests.length >= SAMPLE_COUNT,
      `the recordings did not start loading when the piano opened (${sampleRequests.length} of ${SAMPLE_COUNT} requested)`,
      WAIT_MS,
    );
    pass('The recordings start loading as soon as the piano opens');
  },
});
