import assert from 'node:assert/strict';
import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { openTrackMenu, waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// web-platform-modernization 1.2 (F3, F4): a sheet is an accessible modal
// dialog. It has a role and a name, its dismiss backdrop is not an unnamed
// button, keyboard focus moves in, stays in while Tab is pressed, and goes back
// to the control that opened it. Asserts the intended behaviour; each failure
// says which part is missing so task 3.1 / 3.2 can be scoped from the output.
const TRACK = 'Soprano Part';
const OPENER_LABEL = `${TRACK} options`;
const TAB_PRESSES = 40;
const WAIT_MS = 5000;

const library = {
  playlists: [],
  sources: [buildMockSource(TRACK)],
};

type DialogProbe = {
  hasDialog: boolean;
  isModal: boolean;
  name: string;
  unnamedButtons: number;
};

// Reads the sheet's own markup: the topmost dialog, its name, and any control
// exposed as a button that has neither a name nor text.
const probeDialog = (page: Page): Promise<DialogProbe> =>
  page.evaluate(() => {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')];
    const dialog = dialogs[dialogs.length - 1];

    if (!dialog) {
      return { hasDialog: false, isModal: false, name: '', unnamedButtons: 0 };
    }

    // No named helper inside: the test runner's transform injects a `__name`
    // helper into a named function, which does not exist in the page.
    const name = (
      dialog.getAttribute('aria-label') ??
      dialog.getAttribute('aria-labelledby') ??
      dialog.textContent ??
      ''
    ).trim();
    // The backdrop sits beside the dialog's surface, under the same modal root.
    const root = dialog.parentElement ?? dialog;
    let unnamedButtons = 0;

    for (const button of root.querySelectorAll('[role="button"]')) {
      const label = (
        button.getAttribute('aria-label') ??
        button.getAttribute('aria-labelledby') ??
        button.textContent ??
        ''
      ).trim();

      if (!label) {
        unnamedButtons += 1;
      }
    }

    return {
      hasDialog: true,
      isModal: dialog.getAttribute('aria-modal') === 'true',
      name,
      unnamedButtons,
    };
  });

const focusIsInDialog = (page: Page) =>
  page.evaluate(() => {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')];
    const dialog = dialogs[dialogs.length - 1];

    return Boolean(dialog?.contains(document.activeElement));
  });

const focusIsOnOpener = (page: Page) =>
  page.evaluate(
    (label) => document.activeElement?.getAttribute('aria-label') === label,
    OPENER_LABEL,
  );

void runScenario({
  library,
  steps: async ({ page, pass }) => {
    await waitForTrack(page, TRACK);
    // Focus the opener the way a keyboard user would arrive at it.
    await page.getByLabel(OPENER_LABEL).first().focus();
    await page.keyboard.press('Enter');

    await waitUntil(
      async () => (await probeDialog(page)).hasDialog,
      'the track menu is not exposed as a dialog',
    );

    const probe = await probeDialog(page);

    assert.ok(probe.name, 'the dialog has no accessible name');
    assert.ok(probe.isModal, 'the dialog is not marked aria-modal');
    pass('The sheet is a named modal dialog');

    await waitUntil(
      () => focusIsInDialog(page),
      'focus did not move into the dialog on open',
    );
    pass('Focus moves into the dialog on open');

    for (let press = 0; press < TAB_PRESSES; press += 1) {
      await page.keyboard.press('Tab');
      assert.ok(
        await focusIsInDialog(page),
        `Tab ${press + 1} moved focus out of the dialog`,
      );
    }
    pass('Tab never leaves the dialog');

    await page.keyboard.press('Escape');
    await page
      .locator('[role="dialog"]')
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    await waitUntil(
      () => focusIsOnOpener(page),
      'focus did not return to the control that opened the dialog',
    );
    pass('Closing the dialog returns focus to its opener');

    // A pointer opener restores focus too: open from a click, close, check.
    await openTrackMenu(page, TRACK);
    await page.keyboard.press('Escape');
    await waitUntil(
      () => focusIsOnOpener(page),
      'focus did not return after a pointer-opened dialog closed',
    );
    await page
      .locator('[role="dialog"]')
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    pass('Focus returns to the opener after a pointer-opened dialog too');

    // Last, so the focus checks above report even while this one fails.
    assert.equal(
      probe.unnamedButtons,
      0,
      'the sheet has a button with no accessible name (the dismiss backdrop)',
    );
    pass('The sheet has no unnamed buttons (the dismiss backdrop is named)');
  },
});
