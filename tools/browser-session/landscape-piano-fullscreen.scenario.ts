import type { Locator, Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { openPiano, WAIT_MS } from './piano-helpers';
import { waitForTrack, waitUntil } from './page-helpers';
import { emulateInsets, INSETS, settledBox } from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// Issue #46, Part 2 (task 3.5a): in the wide-short layout the piano has a Full
// screen option. Full screen hides the rail, the pane and the content, fills
// the window height below a slim bar, is remembered on the device, leaves
// playback running (with a chip to pause it), shows the sung note, can hide
// its bar after a few seconds, and gives way to the docked piano when the
// window turns upright.
const LANDSCAPE = { height: 390, width: 844 };
const PORTRAIT = { height: 844, width: 390 };
const TONE_SECONDS = 30;
const BAR_HEIGHT = 40;
const COMPACT_KEYS_HEIGHT = 104;
const TOLERANCE = 3;
const AUTO_HIDE_WAIT_MS = 9000;
const READOUT_PATTERN = /^[A-G][♯♭]?\d · /;

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

const keyboard = (page: Page) => page.getByTestId('piano-keyboard');
const chip = (page: Page) => page.getByTestId('piano-playing-chip');
const rail = (page: Page) =>
  page.getByRole('button', { exact: true, name: 'Library' });

const boxOf = async (target: Locator, name: string) => {
  const box = await settledBox(target);

  if (!box) {
    throw new Error(`${name} is not on screen`);
  }

  return box;
};

/** Whether the browser would deliver a touch at the element's centre to it. */
const isReachable = (target: Locator) =>
  target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
    );

    return hit !== null && (element.contains(hit) || hit.contains(element));
  });

const isPaused = (page: Page, expected: boolean) =>
  waitUntil(
    async () => (await readMediaState(page))?.paused === expected,
    expected ? 'the track did not pause' : 'the track did not play',
  );

const opacityOf = (target: Locator) =>
  target.evaluate((element) => {
    let opacity = 1;

    for (let node: Element | null = element; node; node = node.parentElement) {
      opacity *= Number(getComputedStyle(node).opacity);
    }

    return opacity;
  });

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  microphone: true,
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await page.getByLabel('Play Alto Part').first().click();
    await isPaused(page, false);
    await page.setViewportSize(LANDSCAPE);
    await page.getByTestId('now-playing-pane').waitFor({ timeout: WAIT_MS });

    // Pitch first (it puts the trailing panel where the pane was, and the tools menu is behind the full screen piano), then the piano.
    await page.getByLabel('Practice tools', { exact: true }).click();
    await page.getByLabel('Pitch detection, off').click();
    await page.getByLabel('Close practice tools').first().click();
    await openPiano(page);

    // Full screen is a button next to Close.
    const full = page.getByLabel('Full screen');
    const close = page.getByLabel('Close piano');
    const fullBox = await boxOf(full, 'Full screen');
    const closeBox = await boxOf(close, 'Close piano');

    if (fullBox.x >= closeBox.x || closeBox.x - fullBox.x > 2 * fullBox.width) {
      throw new Error('Full screen is not next to Close');
    }

    await full.click();
    await page.getByLabel('Exit full screen').waitFor({ timeout: WAIT_MS });

    if (await isReachable(rail(page))) {
      throw new Error('the rail is still visible in full screen');
    }

    if (await isReachable(page.getByTestId('practice-tools-panel'))) {
      throw new Error('the trailing panel is still reachable in full screen');
    }

    const keys = await boxOf(keyboard(page), 'the keyboard');

    if (
      Math.abs(keys.y - BAR_HEIGHT) > TOLERANCE ||
      Math.abs(keys.y + keys.height - LANDSCAPE.height) > TOLERANCE ||
      keys.width < LANDSCAPE.width - TOLERANCE
    ) {
      throw new Error(
        `the keyboard does not fill the window below the bar (${JSON.stringify(keys)})`,
      );
    }

    await shot('1-full-screen');
    pass('Full screen hides the rail and pane and fills the window height');

    // Playback continues, with a chip to pause it.
    await isPaused(page, false);
    await chip(page).waitFor({ timeout: WAIT_MS });
    await chip(page).click();
    await isPaused(page, true);
    await chip(page).click();
    await isPaused(page, false);
    pass('The track keeps playing and the chip pauses and resumes it');

    // The sung note reads out in the bar.
    await waitUntil(async () => {
      const text = await page
        .getByText(READOUT_PATTERN)
        .first()
        .textContent()
        .catch(() => null);

      return text !== null && READOUT_PATTERN.test(text);
    }, 'the bar never showed the sung note');
    await shot('2-sung-note');
    pass('The bar reads out the sung note');

    // Remembered: closing and reopening comes back full screen.
    await close.click();
    await keyboard(page).waitFor({ state: 'detached', timeout: WAIT_MS });
    await page.getByLabel('Practice tools', { exact: true }).click();
    await page.getByLabel('Piano, off').click();
    await page.getByLabel('Exit full screen').waitFor({ timeout: WAIT_MS });
    pass('The piano reopens in full screen, as it was closed');

    // The menu that turned it on is closed, not left open underneath.
    await page.getByLabel('Exit full screen').click();
    await rail(page).waitFor({ timeout: WAIT_MS });
    if ((await page.getByLabel('Close practice tools').count()) !== 0) {
      throw new Error('the tools menu was left open under full screen');
    }
    await page.getByLabel('Full screen').click();
    await page.getByLabel('Exit full screen').waitFor({ timeout: WAIT_MS });

    // Auto-hide: the controls fade after a few seconds, Exit stays, the keys
    // keep their size, and a touch brings the controls back.
    const volume = page.getByLabel('Piano volume');

    await page.getByLabel('Auto-hide controls').click();
    await waitUntil(
      async () => (await opacityOf(volume)) === 0,
      'the controls did not hide',
      AUTO_HIDE_WAIT_MS,
    );

    const hidden = await boxOf(keyboard(page), 'the keyboard');

    if (Math.abs(hidden.height - keys.height) > TOLERANCE) {
      throw new Error('the keys resized when the bar hid its controls');
    }

    if (!(await page.getByLabel('Exit full screen').isVisible())) {
      throw new Error('Exit full screen is not left while the bar is hidden');
    }

    await shot('3-bar-hidden');
    await page.mouse.click(LANDSCAPE.width / 2, LANDSCAPE.height - 30);
    await waitUntil(
      async () => (await opacityOf(volume)) === 1,
      'a touch did not bring the controls back',
    );
    await page.getByLabel('Auto-hide controls').click();
    pass(
      'Auto-hide hides the controls, keeps Exit and the key size, and a touch wakes it',
    );

    // Turning upright shows the docked piano and keeps the choice.
    await page.setViewportSize(PORTRAIT);
    await page.getByLabel('Piano height').waitFor({ timeout: WAIT_MS });
    if ((await page.getByLabel('Exit full screen').count()) !== 0) {
      throw new Error('full screen persisted upright');
    }
    await page.setViewportSize(LANDSCAPE);
    await page.getByLabel('Exit full screen').waitFor({ timeout: WAIT_MS });
    pass('Upright shows the docked piano; turning back returns to full screen');

    // Exit: the compact keyboard and the shell return.
    await page.getByLabel('Exit full screen').click();
    await rail(page).waitFor({ timeout: WAIT_MS });
    const compact = await boxOf(keyboard(page), 'the keyboard');

    if (Math.abs(compact.height - COMPACT_KEYS_HEIGHT) > TOLERANCE) {
      throw new Error('the compact keyboard did not return');
    }

    await shot('4-exited');
    pass('Exit full screen brings back the compact keyboard and the rail');

    // With a Dynamic Island on a side, the bar stays clear of it.
    await emulateInsets(page);
    await full.click();
    const exit = await boxOf(page.getByLabel('Exit full screen'), 'Exit');
    const closeNow = await boxOf(close, 'Close piano');

    if (
      closeNow.x + closeNow.width >
      LANDSCAPE.width - INSETS.right + TOLERANCE
    ) {
      throw new Error('Close piano runs under the inset');
    }

    if (exit.x < INSETS.left) {
      throw new Error('the bar runs under the leading inset');
    }

    await shot('5-insets');
    pass('The full screen bar stays inside the safe areas');
  },
});
