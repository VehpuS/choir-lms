import { withMockTags } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import {
  openTab,
  openTrackMenu,
  visibleText,
  waitForTrack,
  waitUntil,
} from './page-helpers';
import { runScenario } from './scenario-runner';

// Tags: add tags to a track by typing and from the suggestions, remove one,
// see them grouped in the Tags view and in a tag's detail, and see the popular
// ones in Recents. Each change is checked on screen and in what the app saved.
const OWNER = 'local-device-user';
const SOURCES_KEY = `choirlms:practice:sources:${OWNER}`;
const WAIT_MS = 5000;

type StoredSource = { name: string; tags?: string[] };

const alto = withMockTags(buildMockSource('Alto Part'), ['Mass']);
const tenor = buildMockSource('Tenor Part');
const soprano = buildMockSource('Soprano Part');

void runScenario({
  library: { playlists: [], sources: [alto, tenor, soprano] },
  steps: async ({ page, pass, session, shot }) => {
    const savedTags = async (trackName: string) =>
      (await session.readStored<StoredSource[]>(SOURCES_KEY))?.find(
        ({ name }) => name === trackName,
      )?.tags;
    const editTags = async (trackName: string) => {
      await openTrackMenu(page, trackName);
      await page.getByText('Edit tags', { exact: true }).click();
      await page.getByText(/Track tags/).waitFor({ timeout: WAIT_MS });
    };

    await waitForTrack(page, 'Alto Part');

    // Type a tag, add a suggested one, and save.
    await editTags('Tenor Part');
    await page.getByRole('textbox').fill('Easy');
    await page.keyboard.press('Enter');
    await page
      .getByText('SUGGESTED TAGS', { exact: false })
      .waitFor({ timeout: WAIT_MS });
    await page.getByText('Mass', { exact: true }).last().click();
    await page.getByText('Save tags', { exact: true }).click();
    await waitUntil(
      async () => (await savedTags('Tenor Part'))?.join() === 'Easy,Mass',
      'the typed and suggested tags were not saved',
    );
    pass('Edit tags saves a typed tag and a suggested one');

    // The Tags view groups the items by tag, and a tag opens its items.
    await page.getByText('Tags', { exact: true }).first().click();
    await page
      .getByText('TAGS (2)', { exact: false })
      .waitFor({ timeout: WAIT_MS });
    await page.getByText('2 items · Added Jan 1').waitFor({ timeout: WAIT_MS });
    await shot('1-tags-view');
    await page.getByText('Mass', { exact: true }).first().click();
    await page
      .getByText('ITEMS (2)', { exact: false })
      .waitFor({ timeout: WAIT_MS });
    await page
      .getByText('Alto Part', { exact: true })
      .waitFor({ timeout: WAIT_MS });
    await page
      .getByText('Tenor Part', { exact: true })
      .waitFor({ timeout: WAIT_MS });
    await shot('2-tag-detail');
    pass(
      'The Tags view lists each tag, and a tag opens the items that have it',
    );

    await page.getByLabel('Close tag detail').click();

    // Popular tags show in Recents.
    await openTab(page, 'Recents');
    await page.getByText('Popular tags').waitFor({ timeout: WAIT_MS });
    await visibleText(page, 'Mass').waitFor({ timeout: WAIT_MS });
    await shot('3-recents-popular-tags');
    pass('Recents shows the popular tags');

    // Remove a tag.
    await openTab(page, 'Library');
    await page.getByText('Tracks', { exact: true }).first().click();
    await editTags('Tenor Part');
    await page
      .getByLabel(/Remove.*Easy|Easy.*remove/i)
      .first()
      .click();
    await page.getByText('Save tags', { exact: true }).click();
    await waitUntil(
      async () => (await savedTags('Tenor Part'))?.join() === 'Mass',
      'the removed tag is still saved',
    );
    pass('Removing a tag and saving leaves the others');
  },
});
