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
    // Requests are counted per document: the page that was open before the
    // reload may run its own warm-up (it waits for the browser to be idle)
    // after the listener is attached, and those requests are not this launch's.
    const requestsByDocument = new Map<number, string[]>();
    let currentDocument = 0;
    const sampleRequestsNow = () =>
      requestsByDocument.get(currentDocument) ?? [];

    page.on('request', (request) => {
      // A new document starts with its own navigation request (history pushes
      // by the router make none).
      if (
        request.isNavigationRequest() &&
        request.frame() === page.mainFrame()
      ) {
        currentDocument += 1;
      }

      if (/\.mp3(\?|$)/.test(request.url())) {
        requestsByDocument.set(currentDocument, [
          ...sampleRequestsNow(),
          request.url(),
        ]);
      }
    });

    // A fresh launch: reload with the listeners already in place.
    await page.reload();
    await waitForTrack(page, 'Alto Part').catch(() => undefined);

    await waitUntil(
      async () => sampleRequestsNow().length >= SAMPLE_COUNT,
      `the recordings were not fetched at app start (${sampleRequestsNow().length} of ${SAMPLE_COUNT} requested, piano never opened)`,
      WAIT_MS,
    );
    pass('The recordings are fetched at app start, before the piano is opened');

    await openPiano(page);
    await page.waitForTimeout(1000);
    assert.equal(
      sampleRequestsNow().length,
      SAMPLE_COUNT,
      'opening the piano fetched the recordings again instead of using the warmed ones',
    );
    pass('Opening the piano fetches nothing more');
  },
});
