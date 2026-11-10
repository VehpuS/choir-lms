import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { openTab, visibleText, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// The Add tab against the mock Drive: browse My Drive and a folder, search by
// name (which looks in every folder), and switch to Shared with you. The mock
// answers browse and name queries the way Drive does, and records the queries,
// so what the app asked is checked as well as what it shows.
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
];

void runScenario({
  drive: { files, state: 'authorized' },
  library: { playlists: [], sources: [buildMockSource('Soprano Part')] },
  steps: async ({ page, pass, session, shot }) => {
    const queried = (text: string) =>
      session.drive.listQueries.some((query) => query.includes(text));

    await openTab(page, 'Add');

    // Browse My Drive: its folder and the tracks in it, not the one in the folder.
    await visibleText(page, 'Rehearsal Audio').waitFor({ timeout: WAIT_MS });
    await visibleText(page, 'Alto Part.mp3').waitFor({ timeout: WAIT_MS });
    await visibleText(page, 'Bass Part.mp3').waitFor({ timeout: WAIT_MS });
    await page.getByText('MP3 · 1.9 MB').first().waitFor({ timeout: WAIT_MS });
    if (await visibleText(page, 'Tenor Part.mp3').count()) {
      throw new Error('a file inside a folder was listed at the top level');
    }

    if (!queried("'root' in parents")) {
      throw new Error('browsing did not ask Drive for the root folder');
    }

    await shot('1-my-drive');
    pass(
      'My Drive lists its folder and its tracks, not what is inside the folder',
    );

    // Open the folder.
    await visibleText(page, 'Rehearsal Audio').click();
    await visibleText(page, 'Tenor Part.mp3').waitFor({ timeout: WAIT_MS });
    await waitUntil(
      async () => queried(`'${FOLDER_ID}' in parents`),
      'opening the folder did not ask Drive for its contents',
    );
    await shot('2-folder');
    pass('Opening a folder lists what is inside it');

    // Search by name looks in every folder.
    await page.getByLabel('Search Google Drive').click();
    await page.getByRole('textbox').first().fill('bass');
    await page.keyboard.press('Enter');
    await visibleText(page, 'Bass Part.mp3').waitFor({ timeout: WAIT_MS });
    await page
      .getByText('CURRENT SEARCH SCOPE', { exact: false })
      .waitFor({ timeout: WAIT_MS });
    if (!queried("name contains 'bass'")) {
      throw new Error('the search did not ask Drive for the name');
    }

    if (await visibleText(page, 'Alto Part.mp3').count()) {
      throw new Error('the search listed a file that does not match');
    }

    await shot('3-search-bass');
    pass('Searching a name lists only the matching files');

    await page.getByRole('textbox').first().fill('tenor');
    await page.keyboard.press('Enter');
    await visibleText(page, 'Tenor Part.mp3').waitFor({ timeout: WAIT_MS });
    await shot('4-search-tenor');
    pass('A name search finds a file inside a folder');
  },
});
