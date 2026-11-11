import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { openTrackMenu, waitForTrack, waitUntil } from './page-helpers';
import { settledBox } from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// Issue #46, Part 2 (task 3.7): on iOS Safari the soft keyboard shrinks the
// visual viewport but not the layout viewport, so a sheet anchored to the
// bottom (or a side sheet that fills the height) has its field under the
// keyboard. Sheets and dialogs pad by the keyboard's height and bring the
// focused field into view. Chromium has no soft keyboard, so the scenario
// stands in for the signal the app reads: a controllable `visualViewport`.
// Whether iOS Safari really behaves like it is for a device check.
const LANDSCAPE = { height: 390, width: 844 };
const PORTRAIT = { height: 844, width: 390 };
const LANDSCAPE_KEYBOARD = 170;
const PORTRAIT_KEYBOARD = 300;
const WAIT_MS = 5000;
const TOLERANCE = 2;

const alto = buildMockSource('Alto Part');

/** A `visualViewport` the scenario can shrink and grow like a soft keyboard. */
const installFakeVisualViewport = async (page: Page) => {
  // Plain script text: it runs in the page, where the test tooling's helpers do not exist.
  await page.addInitScript(`
    (() => {
      const target = new EventTarget();
      let keyboardHeight = 0;
      // The height follows the window, so turning the phone keeps it honest.
      Object.defineProperties(target, {
        height: { get() { return window.innerHeight - keyboardHeight; } },
        width: { get() { return window.innerWidth; } },
        offsetTop: { value: 0 },
        offsetLeft: { value: 0 },
        pageTop: { value: 0 },
        pageLeft: { value: 0 },
        scale: { value: 1 },
      });
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: target,
      });
      // A real visual viewport also resizes with the window (react-native-web reads it).
      window.addEventListener('resize', () => {
        target.dispatchEvent(new Event('resize'));
      });
      window.__setKeyboard = (height) => {
        keyboardHeight = height;
        target.dispatchEvent(new Event('resize'));
      };
    })();
  `);
};

const setKeyboard = (page: Page, height: number) =>
  page.evaluate(
    (value) =>
      (
        window as unknown as { __setKeyboard: (height: number) => void }
      ).__setKeyboard(value),
    height,
  );

const expectAboveKeyboard = async (
  page: Page,
  keyboardHeight: number,
  windowHeight: number,
  what: string,
) => {
  const field = page.getByRole('textbox');

  await waitUntil(async () => {
    const box = await settledBox(field);

    return (
      box !== null &&
      box.y + box.height <= windowHeight - keyboardHeight + TOLERANCE
    );
  }, `${what}: the text field is under the keyboard`);
  const save = page.getByText('Save tags', { exact: true });

  await waitUntil(async () => {
    const box = await settledBox(save);

    return (
      box !== null &&
      box.y + box.height <= windowHeight - keyboardHeight + TOLERANCE
    );
  }, `${what}: the Save tags button is under the keyboard`);
};

void runScenario({
  library: { playlists: [], sources: [alto] },
  steps: async ({ page, pass, shot }) => {
    await installFakeVisualViewport(page);
    await page.reload();
    await waitForTrack(page, 'Alto Part');

    // Landscape: the tag editor is a side sheet that fills the height.
    await page.setViewportSize(LANDSCAPE);
    await openTrackMenu(page, 'Alto Part');
    await page.getByText('Edit tags', { exact: true }).click();
    await page.getByText(/Track tags/).waitFor({ timeout: WAIT_MS });
    await page.getByRole('textbox').click();
    await setKeyboard(page, LANDSCAPE_KEYBOARD);
    await expectAboveKeyboard(
      page,
      LANDSCAPE_KEYBOARD,
      LANDSCAPE.height,
      'landscape',
    );
    await shot('1-landscape-keyboard');
    pass('In landscape the tag editor and its field stay above the keyboard');

    // The keyboard closing gives the sheet its height back.
    await setKeyboard(page, 0);
    await waitUntil(async () => {
      const box = await settledBox(
        page.getByText('Save tags', { exact: true }),
      );

      return (
        box !== null &&
        box.y + box.height > LANDSCAPE.height - LANDSCAPE_KEYBOARD
      );
    }, 'the sheet did not give its height back');
    pass('Closing the keyboard gives the sheet its height back');
    await page.keyboard.press('Escape');

    // Upright: the bottom sheet lifts above the keyboard.
    await page.setViewportSize(PORTRAIT);
    // The layout follows the window a frame later: wait for the bottom tabs.
    await waitUntil(async () => {
      const tab = await page
        .getByRole('button', { exact: true, name: 'Library' })
        .boundingBox();

      return tab !== null && tab.y > PORTRAIT.height / 2;
    }, 'the upright layout did not return');
    await openTrackMenu(page, 'Alto Part');
    await page.getByText('Edit tags', { exact: true }).click();
    await page.getByText(/Track tags/).waitFor({ timeout: WAIT_MS });
    await page.getByRole('textbox').click();
    await setKeyboard(page, PORTRAIT_KEYBOARD);
    await expectAboveKeyboard(
      page,
      PORTRAIT_KEYBOARD,
      PORTRAIT.height,
      'upright',
    );
    await shot('2-upright-keyboard');
    pass('Upright the bottom sheet lifts above the keyboard');
  },
  viewport: LANDSCAPE,
});
