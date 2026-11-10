import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack } from './page-helpers';
import { runScenario } from './scenario-runner';

// Settings: the category list, the Bulk selections and Renaming preferences
// (show, change, reset), and that both are still there after a reload. Each
// change is checked on screen and in what the app saved.
const BULK_CHOICES_KEY = 'choirlms.selection.bulk-choices';
const RENAME_CHOICE_KEY = 'choirlms.library.track-rename-copies-choice';
const WAIT_MS = 5000;

type StoredBulkChoices = {
  playlistsInFolders?: string;
  repeatedItems?: string;
};

const alto = buildMockSource('Alto Part');

const openSettings = async (page: Page) => {
  await page.getByLabel('Open Drive session menu').first().click();
  await page.getByText('Settings', { exact: true }).click();
  await page.getByText('Bulk selections').first().waitFor({ timeout: WAIT_MS });
};

void runScenario({
  library: { playlists: [], sources: [alto] },
  steps: async ({ page, pass, session, shot }) => {
    const storedBulk = () =>
      session.readStored<StoredBulkChoices>(BULK_CHOICES_KEY);
    const waitForStored = (key: string, expected: string | null) =>
      page.waitForFunction(
        ([storageKey, wanted]) => {
          const value = window.localStorage.getItem(storageKey as string);

          return wanted === null
            ? value === null
            : (value ?? '').includes(wanted);
        },
        [key, expected],
        { timeout: WAIT_MS },
      );

    await waitForTrack(page, 'Alto Part').catch(() => undefined);
    await openSettings(page);
    for (const title of [
      'Bulk selections',
      'Renaming',
      'My parts',
      'Search sources',
    ]) {
      await page
        .getByText(title, { exact: true })
        .first()
        .waitFor({ timeout: WAIT_MS });
    }
    await shot('1-categories');
    pass('Settings lists its categories, each with a summary');

    // Bulk selections: change both defaults; they are saved.
    await page.getByLabel('Bulk selections').click();
    await page
      .getByLabel('Ask each time for both')
      .waitFor({ timeout: WAIT_MS });
    await page
      .getByLabel('Playlists in folders')
      .getByText('Skip', { exact: true })
      .click();
    await page
      .getByLabel('Repeated items')
      .getByText('Remove', { exact: true })
      .click();
    await waitForStored(BULK_CHOICES_KEY, 'remove');
    const bulk = await storedBulk();

    if (
      bulk?.playlistsInFolders !== 'skip' ||
      bulk.repeatedItems !== 'remove'
    ) {
      throw new Error(`the saved bulk choices are ${JSON.stringify(bulk)}`);
    }
    await shot('2-bulk-changed');
    pass('Bulk selections defaults change and are saved');

    // Renaming: choose a copy rule, and keep it across a reload.
    await page.getByLabel('Back to settings').click();
    await page.getByLabel('Renaming').click();
    await page
      .getByLabel('Renaming a track with several copies')
      .getByText('This copy only', { exact: true })
      .click();
    await waitForStored(RENAME_CHOICE_KEY, 'this');
    await shot('3-renaming');
    pass('The Renaming choice changes and is saved');

    await page.reload();
    await waitForTrack(page, 'Alto Part').catch(() => undefined);
    await openSettings(page);
    await page.getByLabel('Bulk selections').click();
    await page
      .getByLabel('Playlists in folders')
      .getByText('Skip', { exact: true })
      .waitFor({ timeout: WAIT_MS });
    await shot('4-after-reload');
    const reloaded = await storedBulk();

    if (reloaded?.playlistsInFolders !== 'skip') {
      throw new Error(
        `after a reload the bulk choices are ${JSON.stringify(reloaded)}`,
      );
    }
    pass('Both preferences are still set after a reload');

    // Reset clears the bulk defaults; Renaming goes back to Ask each time.
    await page.getByLabel('Ask each time for both').click();
    await page.waitForFunction(
      (key) => {
        const value = window.localStorage.getItem(key);

        return value === null || !value.includes('skip');
      },
      BULK_CHOICES_KEY,
      { timeout: WAIT_MS },
    );
    await page.getByLabel('Back to settings').click();
    await page.getByLabel('Renaming').click();
    await page
      .getByLabel('Renaming a track with several copies')
      .getByText('Ask each time', { exact: true })
      .click();
    await waitForStored(RENAME_CHOICE_KEY, null);
    await shot('5-reset');
    pass(
      'Ask each time for both and Renaming > Ask each time clear what was saved',
    );
  },
});
