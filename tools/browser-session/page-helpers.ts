import type { Page } from 'playwright';

// Small, stable-locator helpers that most scenarios repeat. They use the
// accessible names the app already exposes (the tab buttons, a track's
// `<name> options` button, text), never styles or test-only ids.
const TOAST_TIMEOUT_MS = 5000;

export type AppTab = 'Add' | 'Library' | 'Recents';

/** Presses a bottom tab. */
export const openTab = async (page: Page, tab: AppTab) => {
  await page.getByRole('button', { exact: true, name: tab }).click();
};

/** Waits until the Library list shows a track (the app has read the library). */
export const waitForTrack = async (page: Page, trackName: string) => {
  await page.getByLabel(`${trackName} options`).first().waitFor();
};

/** Opens a track's overflow menu from whichever list is on screen. */
export const openTrackMenu = async (page: Page, trackName: string) => {
  await page.getByLabel(`${trackName} options`).first().click();
};

/** Picks an item in an open menu or sheet by its visible text. */
export const chooseMenuItem = async (page: Page, label: string) => {
  await page.getByText(label, { exact: true }).last().click();
};

/** Waits for a snackbar (or any short-lived message) with this text. */
export const expectToast = async (
  page: Page,
  text: string | RegExp,
  timeoutMs: number = TOAST_TIMEOUT_MS,
) => {
  await page.getByText(text).first().waitFor({ timeout: timeoutMs });
};

/** Fails when the page scrolls sideways, which is a layout break at that width. */
export const expectNoHorizontalOverflow = async (page: Page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );

  if (overflow > 0) {
    throw new Error(`The page overflows sideways by ${overflow}px`);
  }
};

/** Fails unless every named tab button sits fully inside the viewport. */
export const expectTabsInViewport = async (page: Page, tabs: AppTab[]) => {
  const viewport = page.viewportSize();

  for (const tab of tabs) {
    const box = await page
      .getByRole('button', { exact: true, name: tab })
      .boundingBox();

    if (
      !box ||
      !viewport ||
      box.x < 0 ||
      box.y < 0 ||
      box.x + box.width > viewport.width ||
      box.y + box.height > viewport.height
    ) {
      throw new Error(`The ${tab} tab is not fully on screen`);
    }
  }
};

const POLL_INTERVAL_MS = 100;
const POLL_TIMEOUT_MS = 5000;

/**
 * Polls `check` until it is true, for state that follows a click a moment later
 * (a saved value, a re-ordered row). Throws `message` if it never is.
 */
export const waitUntil = async (
  check: () => Promise<boolean>,
  message: string,
  timeoutMs: number = POLL_TIMEOUT_MS,
) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await check()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(message);
};
