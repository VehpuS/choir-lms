import { buildTrackRenameMockLibrary } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { openTrackMenu, waitForTrack } from './page-helpers';
import { runScenario } from './scenario-runner';

// Library Files: search the current folder, create a folder, move a track into
// it, and delete a track's last link (with the confirmation), checking what the
// app saved each time. Signed out: the tracks are unavailable, which does not
// matter for organising them.
const OWNER = 'local-device-user';
const TREE_KEY = `choirlms:practice:library-tree:${OWNER}`;
const SOURCES_KEY = `choirlms:practice:sources:${OWNER}`;
const WAIT_MS = 5000;

type Tree = {
  fileLinks: { entityId: string; parentFolderId: string }[];
  folders: { id: string; name: string }[];
};
type Source = { id: string; name: string };

void runScenario({
  library: buildTrackRenameMockLibrary(),
  steps: async ({ page, pass, session, shot }) => {
    await waitForTrack(page, 'Alto Part');

    // Search narrows the current folder; clearing it brings everything back.
    await page.getByLabel('Search saved library').click();
    await page.getByText(/Scope: This folder/).waitFor({ timeout: WAIT_MS });
    await page.getByRole('textbox').first().fill('sopra');
    await waitForTrack(page, 'Soprano Part');
    await page
      .getByLabel('Alto Part options')
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    await shot('1-search');
    pass('Search narrows the folder to the matching track');

    await page.getByRole('textbox').first().fill('');
    await waitForTrack(page, 'Alto Part');
    await waitForTrack(page, 'Soprano Part');
    pass('Clearing the search brings every row back');

    // Close the search to get the create button back.
    await page.getByLabel('Close search').click();

    // Create a folder.
    await page.getByLabel('Create in Library').click();
    await page.getByText('Create folder', { exact: true }).click();
    await page.getByRole('textbox').fill('Concert');
    await page.getByRole('button', { name: 'Create folder' }).click();
    await page
      .getByText('Concert', { exact: true })
      .waitFor({ timeout: WAIT_MS });
    await page.getByText('0 items').waitFor({ timeout: WAIT_MS });
    const tree = await session.readStored<Tree>(TREE_KEY);
    const concert = tree?.folders.find(({ name }) => name === 'Concert');

    if (!concert) {
      throw new Error('the new folder was not saved to the library tree');
    }

    await shot('2-folder-created');
    pass('A new folder is listed and saved');

    // Move Soprano Part into it.
    await openTrackMenu(page, 'Soprano Part');
    await page.getByText('Move to folder', { exact: true }).click();
    await page.getByText('Move to Library').waitFor({ timeout: WAIT_MS });
    // The picker walks the folders: open one, then move here.
    await page.getByText('Concert', { exact: true }).last().click();
    await page.getByText('Move to Concert').waitFor({ timeout: WAIT_MS });
    await page.getByText('Move here', { exact: true }).click();
    // The app follows the track into the folder it was moved to.
    await page
      .getByText('Library / Concert')
      .or(page.getByText('Concert', { exact: true }))
      .first()
      .waitFor({ timeout: WAIT_MS });
    await waitForTrack(page, 'Soprano Part');

    const moved = await session.readStored<Tree>(TREE_KEY);
    const soprano = (await session.readStored<Source[]>(SOURCES_KEY))?.find(
      ({ name }) => name === 'Soprano Part',
    );
    const copy = moved?.fileLinks.find(
      ({ entityId }) => entityId === soprano?.id,
    );

    if (copy?.parentFolderId !== concert.id) {
      throw new Error('the moved track is not saved in the new folder');
    }

    await shot('3-moved');
    pass('Move to folder saves the track in the new folder and opens it');

    // Deleting the track's last link asks first.
    await openTrackMenu(page, 'Soprano Part');
    await page.getByText('Delete from folder', { exact: true }).click();
    await page
      .getByText('Delete last link from folder?')
      .waitFor({ timeout: WAIT_MS });
    await shot('4-delete-confirm');
    await page.getByText('Cancel', { exact: true }).last().click();
    await waitForTrack(page, 'Soprano Part');
    pass('Cancelling the delete keeps the track');

    await openTrackMenu(page, 'Soprano Part');
    await page.getByText('Delete from folder', { exact: true }).click();
    await page.getByText('Delete item from library').click();
    await page
      .getByLabel('Soprano Part options')
      .waitFor({ state: 'detached', timeout: WAIT_MS });

    const remaining = await session.readStored<Source[]>(SOURCES_KEY);

    if (remaining?.some(({ name }) => name === 'Soprano Part')) {
      throw new Error('the deleted track is still saved in the library');
    }

    pass('Confirming removes the track from the library');
  },
});
