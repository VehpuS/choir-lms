import type { Page } from 'playwright';

import {
  buildMockLoop,
  withMockPlaylistItems,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import {
  buildMockPlaylist,
  buildMockSource,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { buildToneMedia } from './mock-media';
import { openTab, waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Playlists: list, create, rename, reorder, remove an item (with Undo), delete,
// and find a playlist again from Recents after playing it. Each change is checked on
// screen and in what the app saved.
const OWNER = 'local-device-user';
const PLAYLISTS_KEY = `choirlms:practice:playlists:${OWNER}`;
const WAIT_MS = 5000;
const TONE_SECONDS = 20;

type StoredPlaylist = {
  items: { sortIndex: number; title: string }[];
  name: string;
};

const alto = buildMockSource('Alto Part');
const soprano = buildMockSource('Soprano Part');
const tenor = buildMockSource('Tenor Part');
const trickyBars = buildMockLoop(alto, 'Tricky bars');
const sundaySet = withMockPlaylistItems(buildMockPlaylist('Sunday Set'), [
  { source: alto },
  { source: soprano },
  { loop: trickyBars, source: alto },
]);
const tone = buildToneMedia({ seconds: TONE_SECONDS });

/** The vertical position of a row's title, to compare the order rows are shown in. */
const rowTop = async (page: Page, title: string) =>
  (await page.getByText(title, { exact: true }).first().boundingBox())?.y ??
  NaN;

void runScenario({
  drive: {
    media: {
      [alto.driveFileId]: tone,
      [soprano.driveFileId]: tone,
      [tenor.driveFileId]: tone,
    },
    state: 'authorized',
  },
  library: {
    loops: [trickyBars],
    playlists: [sundaySet, buildMockPlaylist('Warmups')],
    sources: [alto, soprano, tenor],
  },
  steps: async ({ page, pass, session, shot }) => {
    const savedPlaylists = async () =>
      (await session.readStored<StoredPlaylist[]>(PLAYLISTS_KEY)) ?? [];
    const savedItemTitles = async (name: string) =>
      (await savedPlaylists())
        .find((playlist) => playlist.name === name)
        ?.items.sort((a, b) => a.sortIndex - b.sortIndex)
        .map(({ title }) => title);

    await waitForTrack(page, 'Alto Part').catch(() => undefined);
    await page.getByText('Playlists', { exact: true }).first().click();

    // The list summarises each playlist.
    await page
      .getByText('3 items · 2 tracks · 1 loop')
      .waitFor({ timeout: WAIT_MS });
    await page.getByText('Empty playlist').waitFor({ timeout: WAIT_MS });
    await shot('1-playlists');
    pass('The Playlists list summarises each playlist');

    // Create one.
    await page.getByLabel('Create playlist').click();
    await page.getByRole('textbox').fill('Concert');
    await page.getByRole('button', { name: 'Create playlist' }).last().click();
    await page.getByLabel('Concert options').waitFor({ timeout: WAIT_MS });
    if (!(await savedPlaylists()).some(({ name }) => name === 'Concert')) {
      throw new Error('the new playlist was not saved');
    }

    pass('Create playlist adds it to the list and saves it');

    // Rename it.
    await page.getByLabel('Concert options').click();
    await page.getByText('Rename playlist', { exact: true }).click();
    await page.getByRole('textbox').fill('Concert Night');
    await page.getByRole('button', { name: 'Save name' }).click();
    await page
      .getByLabel('Concert Night options')
      .waitFor({ timeout: WAIT_MS });
    if (
      !(await savedPlaylists()).some(({ name }) => name === 'Concert Night')
    ) {
      throw new Error('the new name was not saved');
    }

    pass('Rename playlist changes the name everywhere and saves it');

    // Open Sunday Set: reorder and remove an item.
    await page.getByText('Sunday Set', { exact: true }).first().click();
    await page
      .getByText('ITEMS (3)', { exact: false })
      .waitFor({ timeout: WAIT_MS });
    if (
      (await rowTop(page, 'Alto Part')) > (await rowTop(page, 'Soprano Part'))
    ) {
      throw new Error('the items are not in saved order');
    }

    await page.getByLabel('Move Soprano Part up').click();
    await waitUntil(
      async () =>
        (await rowTop(page, 'Soprano Part')) <
        (await rowTop(page, 'Alto Part')),
      'Move up did not reorder the rows',
    );
    await waitUntil(
      async () =>
        (await savedItemTitles('Sunday Set'))?.join() ===
        'Soprano Part,Alto Part,Tricky bars',
      'the new order was not saved',
    );

    await shot('2-reordered');
    pass('Move up reorders the rows and the saved order');

    // Removing asks first, and can be undone.
    await page.getByLabel('More actions for Tricky bars').click();
    await page.getByText('Remove from playlist', { exact: true }).click();
    await page.getByText('Remove playlist item?').waitFor({ timeout: WAIT_MS });
    await page.getByText('Remove item', { exact: true }).click();
    await waitUntil(
      async () =>
        (await savedItemTitles('Sunday Set'))?.join() ===
        'Soprano Part,Alto Part',
      'the removed item is still saved in the playlist',
    );
    await shot('3-item-removed');
    pass('Remove from playlist drops the item after confirming');

    await page.getByText('Undo', { exact: true }).click();
    await waitUntil(
      async () =>
        (await savedItemTitles('Sunday Set'))?.join() ===
        'Soprano Part,Alto Part,Tricky bars',
      'Undo did not restore the item in its place',
    );
    pass('Undo puts the removed item back in its place');

    await page.getByLabel('More actions for Tricky bars').click();
    await page.getByText('Remove from playlist', { exact: true }).click();
    await page.getByText('Remove item', { exact: true }).click();
    await waitUntil(
      async () =>
        (await savedItemTitles('Sunday Set'))?.join() ===
        'Soprano Part,Alto Part',
      'the item was not removed again',
    );

    await page.getByText('Dismiss', { exact: true }).click();

    // Delete Warmups from the list (with confirmation).
    await page.getByLabel('Close playlist detail').click();
    await page.getByLabel('Warmups options').click();
    await page.getByText('Remove from library', { exact: true }).click();
    await page
      .getByText('Remove saved playlist?')
      .waitFor({ timeout: WAIT_MS });
    await page.getByText('Cancel', { exact: true }).last().click();
    await page.getByLabel('Warmups options').waitFor({ timeout: WAIT_MS });
    pass('Cancelling the removal keeps the playlist');

    await page.getByLabel('Warmups options').click();
    await page.getByText('Remove from library', { exact: true }).click();
    await page.getByRole('button', { name: 'Remove playlist' }).click();
    await page
      .getByLabel('Warmups options')
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    if ((await savedPlaylists()).some(({ name }) => name === 'Warmups')) {
      throw new Error('the removed playlist is still saved');
    }

    pass('Confirming removes the playlist from the library');

    // Play it, then find it again from Recents.
    await page.getByLabel('Play Sunday Set').click();
    await page
      .getByText(/Playing · Sunday Set · 1 of 2/)
      .first()
      .waitFor({ timeout: 10_000 });
    await openTab(page, 'Recents');
    await page.getByText('Playing now').waitFor({ timeout: WAIT_MS });
    await shot('4-recents');
    // The row's menu opens it in the library.
    await page.getByLabel('More actions for Sunday Set').click();
    await page.getByText('View in library', { exact: true }).click();
    // It lands on Library > Playlists with the playlist as it was left.
    await page.getByText(/PLAYLISTS \(2\)/i).waitFor({ timeout: WAIT_MS });
    await page
      .getByText('2 items · 2 tracks · 0 loops')
      .waitFor({ timeout: WAIT_MS });
    await shot('5-opened-from-recents');
    pass('A played playlist is in Recents and View in library finds it');
  },
});
