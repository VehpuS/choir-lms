import { withMockPlaylistItems } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import {
  buildMockFolder,
  buildMockPlaylist,
  buildMockSource,
  buildMockTrackCopy,
  type MockLibrary,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack } from './page-helpers';
import { runScenario } from './scenario-runner';

// Bulk selection in Library Files: the selection bar counts and clears, a bulk
// "Add to playlist" saves the chosen tracks, and a folder that holds a playlist
// asks whether to include it, with a "Remember my choice" that is saved and
// then skips the question. Signed in (mock Drive) so the tracks are playable.
const OWNER = 'local-device-user';
const PLAYLISTS_KEY = `choirlms:practice:playlists:${OWNER}`;
const BULK_CHOICES_KEY = 'choirlms.selection.bulk-choices';
const WAIT_MS = 5000;

type StoredPlaylist = { items: unknown[]; name: string };

const alto = buildMockSource('Alto Part');
const soprano = buildMockSource('Soprano Part');
const tenor = buildMockSource('Tenor Part');
const rehearsal = buildMockFolder('Rehearsal');
const warmups = withMockPlaylistItems(buildMockPlaylist('Warmups'), [
  { source: tenor },
]);
const sundaySet = buildMockPlaylist('Sunday Set');
const library: MockLibrary = {
  fileLinks: [
    buildMockTrackCopy(alto),
    buildMockTrackCopy(soprano),
    buildMockTrackCopy(tenor, { folder: rehearsal }),
    {
      entityId: warmups.id,
      entityKind: 'playlist',
      id: 'mock-copy-warmups',
      parentFolderId: rehearsal.id,
    },
  ],
  folders: [rehearsal],
  playlists: [sundaySet, warmups],
  sources: [alto, soprano, tenor],
};

void runScenario({
  drive: { state: 'authorized' },
  library,
  steps: async ({ page, pass, session, shot }) => {
    await waitForTrack(page, 'Alto Part');

    const startSelecting = () =>
      page.getByLabel('Select', { exact: true }).click();
    const pick = (name: string) =>
      page.getByText(name, { exact: true }).first().click();

    // The bar counts what is picked; Select all and Cancel work.
    await startSelecting();
    await page.getByText('0 selected').waitFor({ timeout: WAIT_MS });
    await pick('Alto Part');
    await pick('Soprano Part');
    await page.getByText('2 selected').waitFor({ timeout: WAIT_MS });
    await shot('1-two-selected');
    pass('The selection bar counts the picked rows');

    await page.getByLabel('Select all').click();
    await page.getByText('4 selected').waitFor({ timeout: WAIT_MS });
    pass(
      'Select all picks every row in the folder (folder, tracks and the playlist)',
    );

    await page.getByLabel('Cancel').first().click();
    await page
      .getByLabel('Select', { exact: true })
      .waitFor({ timeout: WAIT_MS });
    pass('Cancel leaves selection mode');

    // Bulk Add to playlist saves both tracks.
    await startSelecting();
    await pick('Alto Part');
    await pick('Soprano Part');
    // Two same-length tracks offer "Composite…" on the bar, so the playlist
    // action is under the more-actions menu.
    await page.getByLabel('More actions').click();
    await page.getByText('Add to playlist', { exact: true }).click();
    await page.getByText('Sunday Set', { exact: true }).last().click();
    await page.waitForFunction(
      ([key]) => {
        const saved = JSON.parse(
          window.localStorage.getItem(key as string) ?? '[]',
        );

        return saved.some(
          (item: StoredPlaylist) =>
            item.name === 'Sunday Set' && item.items.length === 2,
        );
      },
      [PLAYLISTS_KEY],
      { timeout: WAIT_MS },
    );
    await shot('2-added-to-playlist');
    pass('A bulk Add to playlist saves both tracks in the playlist');

    // A folder holding a playlist asks; Skip + Remember is saved...
    await startSelecting();
    await pick('Rehearsal');
    await page.getByText('Add to playlist', { exact: true }).click();
    await page.getByText('Include playlists?').waitFor({ timeout: WAIT_MS });
    await shot('3-include-playlists-prompt');
    await page.getByText('Skip playlists', { exact: true }).click();
    await page.getByText('Remember my choice', { exact: true }).click();
    await page.getByText('Continue', { exact: true }).click();
    await page.waitForFunction(
      ([key]) =>
        (window.localStorage.getItem(key as string) ?? '').includes('skip'),
      [BULK_CHOICES_KEY],
      { timeout: WAIT_MS },
    );
    const remembered = await session.readStored<{
      playlistsInFolders?: string;
    }>(BULK_CHOICES_KEY);

    if (remembered?.playlistsInFolders !== 'skip') {
      throw new Error(`the remembered choice is ${JSON.stringify(remembered)}`);
    }

    pass('Skip playlists with Remember my choice is saved on the device');

    // ...and the same action no longer asks.
    await page.reload();
    await waitForTrack(page, 'Alto Part');
    await startSelecting();
    await pick('Rehearsal');
    await page.getByText('Add to playlist', { exact: true }).click();
    // Only the playlist picker says "already in it" (Warmups holds the Tenor
    // part), so this is the next step: the question was skipped.
    await page.getByText(/already in it/).waitFor({ timeout: WAIT_MS });
    if (await page.getByText('Include playlists?').count()) {
      throw new Error('the remembered choice did not skip the question');
    }

    await shot('4-no-prompt-after-remember');
    pass('The remembered choice skips the question next time');
  },
});
