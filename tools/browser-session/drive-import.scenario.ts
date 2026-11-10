import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { openTab, visibleText, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Adding from Drive: save one track from the Add tab, then select a folder and
// a track and review the import (what will be created, what is already in the
// library), flatten or keep the folder structure, and confirm. Each step is
// checked on screen and in what the app saved.
const OWNER = 'local-device-user';
const SOURCES_KEY = `choirlms:practice:sources:${OWNER}`;
const TREE_KEY = `choirlms:practice:library-tree:${OWNER}`;
const WAIT_MS = 5000;
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const FOLDER_ID = 'folder-rehearsal';

const mp3 = (id: string, name: string, parents?: string[]) => ({
  fileExtension: 'mp3',
  id,
  mimeType: 'audio/mpeg',
  modifiedTime: '2026-01-02T00:00:00.000Z',
  name,
  ...(parents ? { parents } : {}),
  size: '2000000',
});

const files = [
  { id: FOLDER_ID, mimeType: FOLDER_MIME, name: 'Rehearsal Audio' },
  mp3('file-alto', 'Alto Part.mp3'),
  mp3('file-bass', 'Bass Part.mp3'),
  mp3('file-tenor', 'Tenor Part.mp3', [FOLDER_ID]),
  mp3('file-soprano', 'Soprano Part.mp3', [FOLDER_ID]),
];

// Already in the library from the same Drive file as "Alto Part.mp3".
const savedAlto = buildMockSource('Alto Part.mp3', {
  driveFileId: 'file-alto',
  extension: 'mp3',
});

type StoredSource = { driveFileId: string; name: string };
type Tree = { folders: { name: string }[] };

void runScenario({
  drive: { files, state: 'authorized' },
  library: { playlists: [], sources: [savedAlto] },
  steps: async ({ page, pass, session, shot }) => {
    const savedDriveIds = async () =>
      ((await session.readStored<StoredSource[]>(SOURCES_KEY)) ?? [])
        .map(({ driveFileId }) => driveFileId)
        .sort();
    const summary = (label: string) =>
      page
        .getByText(label, { exact: true })
        .locator('xpath=following-sibling::*[1]')
        .first();

    await openTab(page, 'Add');
    await visibleText(page, 'Bass Part.mp3').waitFor({ timeout: WAIT_MS });

    // A track already in the library says so; saving another adds it.
    await page.getByLabel('Save Bass Part.mp3 to library').click();
    await page.getByText('Saved to library').waitFor({ timeout: WAIT_MS });
    await waitUntil(
      async () => (await savedDriveIds()).includes('file-bass'),
      'the saved track is not in the library',
    );
    await shot('1-saved');
    pass('Save adds the track to the library and the row shows Saved');
    await page.getByText('Dismiss', { exact: true }).click();

    // Select a folder and a track, and review.
    await page
      .getByLabel('Select', { exact: true })
      .filter({ visible: true })
      .click();
    await visibleText(page, 'Rehearsal Audio').click();
    await visibleText(page, 'Alto Part.mp3').click();
    await page.getByText('2 selected').waitFor({ timeout: WAIT_MS });
    await shot('2-selected');
    await page.getByText('Continue', { exact: true }).click();
    await page.getByText('Review import').waitFor({ timeout: WAIT_MS });
    await page.getByText('Preserve structure').waitFor({ timeout: WAIT_MS });
    await shot('3-review');

    // The folder holds two new tracks; Alto is already in the library.
    await waitUntil(
      async () => (await summary('Folders to create').textContent()) === '1',
      'the review did not count the folder to create',
    );
    await waitUntil(
      async () => (await summary('New tracks').textContent()) === '2',
      'the review did not count the two new tracks in the folder',
    );
    await waitUntil(
      async () =>
        (await summary('Already in destination').textContent()) === '1',
      'the review did not count the track already in the library',
    );
    pass(
      'The review counts the folder, the new tracks, and the one already in the library',
    );

    // Flatten drops the folder structure.
    await page.getByText('Flatten', { exact: true }).click();
    await waitUntil(
      async () => (await summary('Folders to create').textContent()) === '0',
      'Flatten still creates the folder',
    );
    await shot('4-flatten');
    pass('Flatten leaves no folder to create');

    await page.getByText('Preserve structure', { exact: true }).click();
    await waitUntil(
      async () => (await summary('Folders to create').textContent()) === '1',
      'Preserve structure did not bring the folder back',
    );

    // Confirm: the tracks and the folder are saved.
    await page.getByText('Confirm import', { exact: true }).click();
    await waitUntil(async () => {
      const ids = await savedDriveIds();

      return ['file-soprano', 'file-tenor'].every((id) => ids.includes(id));
    }, 'the imported tracks are not in the library');

    const tree = await session.readStored<Tree>(TREE_KEY);

    if (!tree?.folders.some(({ name }) => name === 'Rehearsal Audio')) {
      throw new Error('the Rehearsal Audio folder was not created');
    }

    await shot('5-imported');
    pass('Confirm import saves the new tracks and creates the folder');

    // Alto was not added a second time.
    const ids = await savedDriveIds();

    if (ids.filter((id) => id === 'file-alto').length !== 1) {
      throw new Error('the track that was already saved was added again');
    }

    pass('A track that is already in the library is not added twice');
  },
});
