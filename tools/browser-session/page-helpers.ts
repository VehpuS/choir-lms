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
