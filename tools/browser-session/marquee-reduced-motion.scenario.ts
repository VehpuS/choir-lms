import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// web-platform-modernization F.2: the mini-player scrolls a long track title
// while playing, and under Reduce Motion it stays still (one line, cut off with
// an ellipsis) instead. Measured as the title's position over time, so the check
// does not depend on how the scrolling is drawn; the first half proves it can
// see motion at all.
const TONE_SECONDS = 60;
const LONG_TITLE = 'Alleluia from the Mass in B minor, long title';
const SAMPLE_GAP_MS = 1200;
const track = buildMockSource(LONG_TITLE, { durationMs: TONE_SECONDS * 1000 });

// Plain script text: it runs in the page, where the test tooling's helpers do not exist.
const TITLE_POSITIONS = `(() => {
  const root = document.querySelector('[aria-label^="Now playing:"]');
  if (!root) return null;
  return Array.from(root.querySelectorAll('[dir="auto"]'))
    .filter((el) => el.textContent === ${JSON.stringify(LONG_TITLE)})
    .map((el) => Math.round(el.getBoundingClientRect().x * 10) / 10);
})()`;

void runScenario({
  drive: {
    media: { [track.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [track] },
  mediaProbe: true,
  steps: async ({ page, pass }) => {
    const positions = () => page.evaluate<number[] | null>(TITLE_POSITIONS);
    const sameAfterAWhile = async () => {
      const before = await positions();

      await page.waitForTimeout(SAMPLE_GAP_MS);

      return JSON.stringify(before) === JSON.stringify(await positions());
    };

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await waitForTrack(page, LONG_TITLE);
    await page.getByLabel(`Play ${LONG_TITLE}`).first().click();
    await waitUntil(
      async () => (await readMediaState(page))?.paused === false,
      'the track did not play',
    );

    await waitUntil(
      async () => !(await sameAfterAWhile()),
      'the long title never scrolled, so the check cannot tell',
    );
    pass('Without the preference the long title scrolls while playing');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await waitUntil(
      sameAfterAWhile,
      'the long title kept scrolling under reduced motion',
    );
    assert.ok(
      ((await positions()) ?? []).length === 1,
      'under reduced motion the title should be one static line, not the scrolling pair',
    );
    pass('Under reduced motion the title stops, as one static line');
  },
});
