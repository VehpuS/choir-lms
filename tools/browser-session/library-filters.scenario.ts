import { withMockTags } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import {
  buildMockFolder,
  buildMockSource,
  buildMockTrackCopy,
  type MockLibrary,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { visibleText, waitForTrack } from './page-helpers';
import { runScenario } from './scenario-runner';

// Library search and filters: the search scope (this folder or all files) and
// the tag filter with Any and All. Signed out: the tracks are unavailable,
// which does not matter for finding them.
const WAIT_MS = 5000;

const choir = buildMockFolder('Choir');
const alto = withMockTags(buildMockSource('Alto Part'), ['Mass', 'Easy']);
const soprano = withMockTags(buildMockSource('Soprano Part'), ['Mass']);
const tenor = withMockTags(buildMockSource('Tenor Part'), ['Easy']);
const library: MockLibrary = {
  fileLinks: [
    buildMockTrackCopy(alto),
    buildMockTrackCopy(soprano),
    buildMockTrackCopy(tenor, { folder: choir }),
  ],
  folders: [choir],
  playlists: [],
  sources: [alto, soprano, tenor],
};

void runScenario({
  library,
  steps: async ({ page, pass, shot }) => {
    const gone = (trackName: string) =>
      page
        .getByLabel(`${trackName} options`)
        .waitFor({ state: 'detached', timeout: WAIT_MS });
    const openFilters = () => page.getByLabel('Show library filters').click();

    await waitForTrack(page, 'Alto Part');

    // Search scope: the track in the Choir folder is not in this folder.
    await page.getByLabel('Search saved library').click();
    await page.getByRole('textbox').first().fill('tenor');
    await page.getByText(/Scope: This folder/).waitFor({ timeout: WAIT_MS });
    await gone('Tenor Part');
    await shot('1-search-this-folder');
    pass('Searching this folder does not find a track in a subfolder');

    await page
      .getByText(/Scope: This folder/)
      .click()
      .catch(() => undefined);
    await openFilters();
    await page.getByText('All files', { exact: true }).click();
    await waitForTrack(page, 'Tenor Part');
    await shot('2-search-all-files');
    pass('Switching the scope to All files finds it');

    await page.getByRole('textbox').first().fill('');
    await page
      .getByLabel('Close search')
      .click()
      .catch(() => undefined);

    // Tag filter: All needs every picked tag, Any needs one of them. The
    // filters panel is still open from the scope step.
    await visibleText(page, 'Mass').click();
    await visibleText(page, 'Easy').click();
    await waitForTrack(page, 'Alto Part');
    await gone('Soprano Part');
    await page
      .getByLabel('Choir options')
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    await shot('3-tags-all');
    pass(
      'With All, only the track that has both tags is shown (and no empty folder)',
    );

    await visibleText(page, 'Any').click();
    // Close the panel so the list is not pushed below the screen.
    await page.getByLabel(/library filters/).click();
    await waitForTrack(page, 'Alto Part');
    await waitForTrack(page, 'Soprano Part');
    // Tenor Part is in the Choir folder, which stays because it holds a match.
    await page.getByLabel('Choir options').waitFor({ timeout: WAIT_MS });
    await shot('4-tags-any');
    pass(
      'With Any, tracks with either tag are shown, and the folder holding one',
    );
  },
});
