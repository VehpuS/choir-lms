import { buildMockLyrics } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Lyrics: a track's lyrics show under the player, can be edited, deleted and
// typed in fresh, and Look up finds lyrics (a mock of the lookup service, with
// the "Before you look up" consent) that are kept only when Saved. Each change
// is checked on screen and in what the app saved.
const OWNER = 'local-device-user';
const WAIT_MS = 5000;
const TONE_SECONDS = 60;
const ORIGINAL_LYRICS = 'Kyrie eleison\nChriste eleison';
const EDITED_LYRICS = `${ORIGINAL_LYRICS}\nKyrie eleison`;
const TYPED_LYRICS = 'Gloria in excelsis Deo';
const LOOKED_UP_LYRICS = 'Sanctus\nSanctus\nSanctus';

type StoredLyrics = { origin: string; text: string };
type StoredSource = { lyrics?: StoredLyrics; name: string };

const withLyrics = buildMockSource('Alto Part', {
  durationMs: TONE_SECONDS * 1000,
  lyrics: buildMockLyrics(ORIGINAL_LYRICS),
});
const withoutLyrics = buildMockSource('Tenor Part', {
  durationMs: TONE_SECONDS * 1000,
});
const tone = buildToneMedia({ seconds: TONE_SECONDS });

void runScenario({
  drive: {
    media: {
      [withLyrics.driveFileId]: tone,
      [withoutLyrics.driveFileId]: tone,
    },
    state: 'authorized',
  },
  library: { playlists: [], sources: [withLyrics, withoutLyrics] },
  lyricsLookup: [
    {
      artistName: 'Choir',
      duration: TONE_SECONDS,
      plainLyrics: LOOKED_UP_LYRICS,
      trackName: 'Sanctus',
    },
    {
      artistName: 'Choir',
      duration: TONE_SECONDS + 140,
      plainLyrics: 'Sanctus (live)',
      trackName: 'Sanctus (live)',
    },
  ],
  mediaProbe: true,
  steps: async ({ page, pass, session, shot }) => {
    const savedLyrics = async (trackName: string) =>
      (
        await session.readStored<StoredSource[]>(
          `choirlms:practice:sources:${OWNER}`,
        )
      )?.find(({ name }) => name === trackName)?.lyrics;
    const openSheetFor = async (trackName: string) => {
      await page.getByLabel(`Play ${trackName}`).first().click();
      await waitUntil(async () => {
        const state = await readMediaState(page);

        return state !== null && !state.paused;
      }, 'the track did not start playing');
      await page.getByLabel(/^Now playing:/).click();
    };
    const lyricsEditor = () => page.getByRole('textbox').last();

    await waitForTrack(page, 'Alto Part');

    // The lyrics show under the player; Edit changes them.
    await openSheetFor('Alto Part');
    await page.getByText('Kyrie eleison').first().waitFor({ timeout: WAIT_MS });
    await page.getByText('Edit', { exact: true }).click();
    await page
      .getByText('Edit lyrics', { exact: true })
      .waitFor({ timeout: WAIT_MS });
    await page.getByText('29 / 20,000').waitFor({ timeout: WAIT_MS });
    await lyricsEditor().fill(EDITED_LYRICS);
    await page.getByText('Save', { exact: true }).last().click();
    await waitUntil(
      async () => (await savedLyrics('Alto Part'))?.text === EDITED_LYRICS,
      'the edited lyrics were not saved',
    );
    if ((await savedLyrics('Alto Part'))?.origin !== 'typed') {
      throw new Error('edited lyrics should be marked as typed');
    }

    await shot('1-lyrics-edited');
    pass('Edit lyrics changes the text and saves it as typed');

    // Delete them: it asks first, and Cancel keeps them.
    await page.getByText('Edit', { exact: true }).click();
    await page.getByText('Delete lyrics', { exact: true }).click();
    await page.getByText('Delete lyrics?').waitFor({ timeout: WAIT_MS });
    await page.getByText('Cancel', { exact: true }).last().click();
    await page
      .getByText('Delete lyrics?')
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    if ((await savedLyrics('Alto Part'))?.text !== EDITED_LYRICS) {
      throw new Error('cancelling the delete changed the lyrics');
    }

    pass('Cancelling the delete keeps the lyrics');

    await page.getByText('Delete lyrics', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Delete lyrics' }).last().click();
    await waitUntil(
      async () => (await savedLyrics('Alto Part')) === undefined,
      'the deleted lyrics are still saved',
    );
    pass('Confirming removes the lyrics');

    // Type lyrics for a track that has none.
    await page.getByLabel('Dismiss playback').click();
    await openSheetFor('Tenor Part');
    await page.getByRole('button', { name: 'Add lyrics' }).click();
    await lyricsEditor().fill(TYPED_LYRICS);
    await page.getByText('Save', { exact: true }).last().click();
    await waitUntil(
      async () => (await savedLyrics('Tenor Part'))?.text === TYPED_LYRICS,
      'the typed lyrics were not saved',
    );
    pass('Add lyrics saves lyrics typed for a track that had none');

    // Look up: consent first, then candidates (closest length first), and
    // nothing is kept until Save.
    await page.getByText('Edit', { exact: true }).click();
    await lyricsEditor().fill('');
    await page.getByText('Look up', { exact: true }).click();
    await page.getByText('Before you look up').waitFor({ timeout: WAIT_MS });
    if (session.lyricsSearches.length > 0) {
      throw new Error('the lookup ran before the user agreed');
    }

    await page.getByText('Continue', { exact: true }).click();
    await page.getByText('Choir · same length').waitFor({ timeout: WAIT_MS });
    await page.getByText(/Choir · \+140 s/).waitFor({ timeout: WAIT_MS });
    await shot('2-lookup-candidates');
    if (session.lyricsSearches.length !== 1) {
      throw new Error(
        `expected one lookup, saw ${session.lyricsSearches.length}`,
      );
    }

    pass(
      'Look up asks first, then lists the candidates with the closest length first',
    );

    await page.getByText('Sanctus', { exact: true }).first().click();
    if ((await savedLyrics('Tenor Part'))?.text !== TYPED_LYRICS) {
      throw new Error('picking a candidate saved before Save was pressed');
    }

    await page.getByText('Save', { exact: true }).last().click();
    await waitUntil(
      async () => (await savedLyrics('Tenor Part'))?.text === LOOKED_UP_LYRICS,
      'the looked-up lyrics were not saved',
    );
    if ((await savedLyrics('Tenor Part'))?.origin !== 'looked-up') {
      throw new Error('looked-up lyrics should be marked as looked up');
    }

    pass('A picked candidate is kept only after Save, and marked as looked up');
  },
});
