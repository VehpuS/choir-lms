import { buildMockComposite } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Composite tracks: the Composites list, playing one, the Mix panel (mute,
// solo, built-in and saved presets), the export sheet, and re-linking a stem
// whose track is gone from the library. Each change is checked on screen and
// in what the app saved.
const OWNER = 'local-device-user';
const COMPOSITES_KEY = `choirlms:practice:composites:${OWNER}`;
const WAIT_MS = 5000;
const TONE_SECONDS = 20;
const PRESET_NAME = 'Sopranos only';

type StoredComposite = {
  name: string;
  presets: { name: string }[];
  stems: { name: string; trackId: string }[];
};

const alto = buildMockSource('Alto Part');
const soprano = buildMockSource('Soprano Part');
const tenor = buildMockSource('Tenor Part');
const missingBass = buildMockSource('Bass Part'); // never added to the library
const kyrie = buildMockComposite('Kyrie mix', [
  { source: soprano, mine: true },
  { source: alto },
]);
const gloria = buildMockComposite('Gloria mix', [
  { source: soprano },
  { source: missingBass },
]);
const tone = buildToneMedia({ seconds: TONE_SECONDS });

void runScenario({
  // Needs a Blob in IndexedDB, which Playwright's WebKit (the WPE build, not
  // desktop Safari) cannot store: see `browser-capabilities`, which tells us
  // when that changes. Confirm on real Safari by hand (tasks.md follow-up F.3).
  requires: ['chromium', 'firefox'],
  drive: {
    media: {
      [alto.driveFileId]: tone,
      [soprano.driveFileId]: tone,
      [tenor.driveFileId]: tone,
    },
    state: 'authorized',
  },
  library: {
    composites: [kyrie, gloria],
    playlists: [],
    sources: [alto, soprano, tenor],
  },
  steps: async ({ page, pass, session, shot }) => {
    const saved = async (name: string) =>
      (
        (await session.readStored<StoredComposite[]>(COMPOSITES_KEY)) ?? []
      ).find((composite) => composite.name === name);

    await waitForTrack(page, 'Alto Part').catch(() => undefined);
    await page.getByText('Composites', { exact: true }).first().click();
    await page
      .getByText('Kyrie mix', { exact: true })
      .first()
      .waitFor({ timeout: WAIT_MS });
    await page
      .getByText('Composite · 2 stems', { exact: false })
      .first()
      .waitFor({ timeout: WAIT_MS });
    await shot('1-list');
    pass('Composites lists each composite with its stem count');

    // Play it: the playback sheet carries the Mix panel with a row per stem.
    await page.getByText('Kyrie mix', { exact: true }).first().click();
    await page.getByText(/^Playing · /).waitFor({ timeout: WAIT_MS });
    await page.getByLabel(/^Now playing:/).click();
    await page.getByLabel('Mute Soprano Part').waitFor({ timeout: WAIT_MS });
    await page
      .getByText('Your part', { exact: true })
      .waitFor({ timeout: WAIT_MS });
    await shot('2-mix-panel');
    pass('Playing a composite opens a Mix panel: every stem, your part marked');

    // Mute and solo are toggles; a soloed stem silences the others.
    await page.getByLabel('Mute Alto Part').click();
    await page
      .locator('[aria-label="Mute Alto Part"][aria-pressed="true"]')
      .waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Mute Alto Part').click();
    await page
      .locator('[aria-label="Mute Alto Part"][aria-pressed="false"]')
      .waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Solo Soprano Part').click();
    await page
      .locator('[aria-label="Solo Soprano Part"][aria-pressed="true"]')
      .waitFor({ timeout: WAIT_MS });
    await shot('3-solo');
    pass('Mute and Solo toggle on and off');

    // Presets: a built-in one first.
    await page.getByLabel(/^Mix preset:/).click();
    await page
      .getByText('Mix presets', { exact: true })
      .waitFor({ timeout: WAIT_MS });
    await shot('4-presets');
    await page.getByLabel('Without Soprano Part').click();
    await page
      .locator('[aria-label="Mute Soprano Part"][aria-pressed="true"]')
      .waitFor({ timeout: WAIT_MS });
    pass(
      'A built-in preset sets the mix (Without Soprano Part mutes your stem)',
    );

    // Save the current mix as a named preset; it is stored with the composite.
    await page.getByLabel('Mute Soprano Part').click();
    await page.getByLabel('Mute Alto Part').click();
    await page.getByLabel('Save as preset').click();
    await page.getByLabel('Preset name').fill(PRESET_NAME);
    await page.getByText('Save', { exact: true }).last().click();
    await waitUntil(
      async () =>
        (await saved('Kyrie mix'))?.presets.some(
          ({ name }) => name === PRESET_NAME,
        ) === true,
      'the preset was not saved with the composite',
    );
    await page
      .getByLabel(`Mix preset: ${PRESET_NAME}`)
      .waitFor({ timeout: WAIT_MS });
    pass(
      'Save as preset stores the named mix with the composite and selects it',
    );

    // Export opens its sheet.
    await page.getByLabel('Export…').click();
    await page
      .getByText('Export', { exact: false })
      .last()
      .waitFor({ timeout: WAIT_MS });
    await page.getByLabel('File name').waitFor({ timeout: WAIT_MS });
    await shot('5-export');
    await page.getByText('Cancel', { exact: true }).last().click();
    await page
      .getByLabel('File name')
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    pass('Export… opens the export sheet and Cancel closes it');

    // A stem whose track is gone shows as missing, and can be re-linked.
    await page.getByLabel('Dismiss playback').click();
    await page
      .getByLabel('Mute Alto Part')
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    await page.getByText('Gloria mix', { exact: true }).first().click();
    await page.getByText(/1 stem missing/).waitFor({ timeout: WAIT_MS });
    await page.getByLabel(/^Now playing:/).click();
    await page
      .getByText('Stem missing', { exact: true })
      .waitFor({ timeout: WAIT_MS });
    await shot('6-missing-stem');
    await page.getByLabel('Re-link Bass Part').click();
    await page.getByLabel('Re-link to Tenor Part').click();
    await waitUntil(
      async () =>
        (await saved('Gloria mix'))?.stems.some(
          ({ trackId }) => trackId === tenor.id,
        ) === true,
      'the stem was not re-linked to the chosen track',
    );
    await page
      .getByText('Stem missing', { exact: true })
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    pass(
      'A stem whose track is gone shows as missing and Re-link points it at another track',
    );
  },
});
