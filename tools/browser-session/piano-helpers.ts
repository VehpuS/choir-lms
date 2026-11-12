import type { Page } from 'playwright';

import {
  analyzeAudioQuality,
  centsBetween,
} from '../../packages/mobile-rehearsal-player/src/test-support/audio/audio-quality';
import type { MockLibrarySession } from './mock-library-session';
import { waitUntil } from './page-helpers';

// Shared steps for the piano scenarios: open the keyboard from the Practice
// tools tab, hold a key by its C-note label, and measure what the page played.
export const WAIT_MS = 5000;
const HOLD_MS = 1200;
const TONE_START_LIMIT_MS = 5000;
const TONE_SETTLE_MS = 800;
const PITCH_TOLERANCE_CENTS = 40;
export const C4_HZ = 261.63;
const KEYBOARD = '[data-testid="piano-keyboard"]';

/** Turns Piano on in the tab's menu and closes the menu; the keyboard is then open. */
export const openPiano = async (page: Page) => {
  await page.getByLabel('Practice tools', { exact: true }).click();
  await page.getByLabel('Piano, off').click();
  await page.getByLabel('Piano, on').waitFor({ timeout: WAIT_MS });
  await page.getByLabel('Close practice tools').first().click();
  await page.locator(KEYBOARD).waitFor({ timeout: WAIT_MS });
};

/** A C key's label (the keyboard labels every C), which sits on the key. */
const keyLabel = (page: Page, note: string) =>
  page.locator(KEYBOARD).getByText(note, { exact: true }).first();

/** The background colour of the key a label sits on. */
export const keyColor = (page: Page, note: string) =>
  keyLabel(page, note).evaluate(
    (label) => getComputedStyle(label.parentElement as Element).backgroundColor,
  );

/**
 * Holds a key down, hands the caller the moment it is held, then lets go.
 * The audio tap is reset first so what it hears is this key.
 */
export const holdKey = async (
  page: Page,
  session: MockLibrarySession,
  note: string,
  whileHeld: () => Promise<void>,
) => {
  const box = await keyLabel(page, note).boundingBox();

  if (!box) {
    throw new Error(`the ${note} key is not on screen`);
  }

  await session.resetAudioOutput();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();

  try {
    await whileHeld();
    await page.waitForTimeout(HOLD_MS);
    // A slow runner (Firefox in CI) can start its audio stream after the first
    // note was pressed. If nothing has been heard yet, keep the key down until
    // something is, then a little longer so there is a tone to measure. The
    // check runs inside the page and copies nothing out: copying the capture
    // repeatedly stalled WebKit, which then never released the key.
    if (!(await session.hasAudioSignal())) {
      await waitUntil(
        () => session.hasAudioSignal(),
        'no sound reached the audio output while the key was held',
        TONE_START_LIMIT_MS,
      ).catch(() => undefined);
      await page.waitForTimeout(TONE_SETTLE_MS);
    }
  } finally {
    await page.mouse.up();
  }
};

/** Fails unless the page's audio output holds a clean tone near `hz`. */
export const expectTone = async (
  session: MockLibrarySession,
  hz: number,
  what: string,
) => {
  const output = await session.readAudioOutput();
  const report = analyzeAudioQuality(output.samples, output.sampleRate);

  if (
    report.pitchHz === null ||
    Math.abs(centsBetween(report.pitchHz, hz)) > PITCH_TOLERANCE_CENTS
  ) {
    throw new Error(
      `${what}: expected about ${hz.toFixed(1)} Hz, heard ${report.pitchHz?.toFixed(1) ?? 'nothing'}`,
    );
  }
};
