import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { openTrackMenu, waitForTrack } from './page-helpers';
import { runScenario } from './scenario-runner';

// web-platform-modernization 1.2b (F6): under prefers-reduced-motion a sheet
// opens without a running animation, and without the preference it does (so
// the check can see animation at all). Samples every frame for a short window
// after the tap and reports the most animations running at once.
const TRACK = 'Soprano Part';
const SAMPLE_MS = 800;

// Run as a string, not a function: the test runner's transform injects a
// `__name` helper into named functions, which the page does not have.
const SAMPLER_SOURCE = `new Promise((resolve) => {
  let peak = 0;
  const start = performance.now();
  const frame = () => {
    peak = Math.max(
      peak,
      document.getAnimations().filter((a) => a.playState === 'running').length,
    );
    if (performance.now() - start < ${SAMPLE_MS}) {
      requestAnimationFrame(frame);
    } else {
      resolve(peak);
    }
  };
  requestAnimationFrame(frame);
})`;

const library = { playlists: [], sources: [buildMockSource(TRACK)] };

void runScenario({
  library,
  steps: async ({ page, pass }) => {
    await waitForTrack(page, TRACK);

    // The sampler must start before the tap, so run both together.
    const sampleAfterOpen = async () => {
      const sampling = page.evaluate<number>(SAMPLER_SOURCE);

      await openTrackMenu(page, TRACK);

      return sampling;
    };

    const closeSheet = async () => {
      await page.keyboard.press('Escape');
      await page
        .locator('[role="dialog"]')
        .waitFor({ state: 'detached', timeout: 5000 });
    };

    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // Animations that run with no sheet at all are not the sheet's.
    const idle = await page.evaluate<number>(SAMPLER_SOURCE);
    assert.equal(idle, 0, 'the page animates with no sheet open');

    const withMotion = await sampleAfterOpen();

    assert.ok(
      withMotion > 0,
      'the control run saw no animation, so the check cannot tell',
    );
    pass(`Without the preference the sheet animates (${withMotion} running)`);
    await closeSheet();

    await page.emulateMedia({ reducedMotion: 'reduce' });

    const reduced = await sampleAfterOpen();

    assert.equal(
      reduced,
      0,
      `the sheet still ran ${reduced} animation(s) under prefers-reduced-motion`,
    );
    pass('Under reduced motion the sheet opens without a running animation');
  },
});
