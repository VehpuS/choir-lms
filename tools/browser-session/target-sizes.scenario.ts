import assert from 'node:assert/strict';
import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { openTrackMenu, waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// web-platform-modernization 1.2c (F14): every visible control is at least
// 24 x 24 CSS pixels (WCAG 2.5.8, the minimum; the app's own token is 44).
// Checked on the library, an open track menu and the playback view. A control
// smaller than that must be listed here with the reason, not skipped silently.
const MIN_SIZE = 24;
const TONE_SECONDS = 30;
const TRACK = 'Alto Part';
const track = buildMockSource(TRACK, { durationMs: TONE_SECONDS * 1000 });

// Run as a string: the test runner's transform injects a `__name` helper into
// named functions, which the page does not have.
const SMALL_CONTROLS_SOURCE = `(() => {
  const min = ${MIN_SIZE};
  const found = [];
  for (const el of document.querySelectorAll('button, [role="button"], [role="tab"], [role="switch"], a[href], input, textarea, select')) {
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    if (style.visibility === 'hidden' || style.display === 'none' || box.width === 0 || box.height === 0) continue;
    if (el.closest('[aria-hidden="true"], [inert]')) continue;
    if (box.width < min || box.height < min) {
      found.push((el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40) + ' ' + Math.round(box.width) + 'x' + Math.round(box.height));
    }
  }
  return found;
})()`;

const expectNoSmallControls = async (page: Page, where: string) => {
  const small = await page.evaluate<string[]>(SMALL_CONTROLS_SOURCE);

  assert.deepEqual(
    small,
    [],
    `${where}: controls under ${MIN_SIZE}px: ${small.join('; ')}`,
  );
};

void runScenario({
  drive: {
    media: { [track.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [track] },
  mediaProbe: true,
  steps: async ({ page, pass }) => {
    await waitForTrack(page, TRACK);
    await expectNoSmallControls(page, 'the library');
    pass('The library has no control under 24px');

    await openTrackMenu(page, TRACK);
    await page.getByRole('dialog').waitFor();
    await expectNoSmallControls(page, 'the track menu');
    pass('The track menu has no control under 24px');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });

    await page.getByLabel(`Play ${TRACK}`).first().click();
    await waitUntil(async () => {
      const state = await readMediaState(page);

      return state !== null && !state.paused;
    }, 'the track did not start playing');
    await page.getByLabel(/^Now playing:/).click();
    await page.getByLabel('Playback practice tools').waitFor();
    await expectNoSmallControls(page, 'the playback view');
    pass('The playback view has no control under 24px');
  },
});
