import { buildMockMarker } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Markers: add one at the playhead, rename it from the confirmation, see the
// list in order, jump to a marker, make a loop from one marker to the next,
// and delete one. Each change is checked on screen and in what the app saved.
const OWNER = 'local-device-user';
const SOURCES_KEY = `choirlms:practice:sources:${OWNER}`;
const LOOPS_KEY = `choirlms:practice:loops:${OWNER}`;
const WAIT_MS = 5000;
const TONE_SECONDS = 60;
const SEEK_FORWARD_S = 15;
// "Add marker here" is pressed a moment after the seek; allow for that.
const ADDED_MIN_MS = 13_000;
const ADDED_MAX_MS = 22_000;
const JUMP_TOLERANCE_S = 2;

type StoredMarker = { name: string; positionMs: number };
type StoredSource = { markers?: StoredMarker[]; name: string };
type StoredLoop = { endMs: number; startMs: number };

const alto = buildMockSource('Alto Part', {
  durationMs: TONE_SECONDS * 1000,
  markers: [
    buildMockMarker('Verse', 12_000),
    buildMockMarker('Chorus', 30_000),
  ],
});

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  steps: async ({ page, pass, session, shot }) => {
    const savedMarkers = async () =>
      (
        (await session.readStored<StoredSource[]>(SOURCES_KEY))?.find(
          ({ name }) => name === 'Alto Part',
        )?.markers ?? []
      ).map(({ name, positionMs }) => ({ name, positionMs }));
    const markerNames = async () =>
      (await savedMarkers()).map(({ name }) => name).join();
    const sheetMenu = (item: string) =>
      page
        .getByRole('button', { exact: true, name: 'More actions' })
        .click()
        .then(() => page.getByText(item, { exact: true }).click());

    await waitForTrack(page, 'Alto Part');
    await page.getByLabel('Play Alto Part').first().click();
    await waitUntil(async () => {
      const state = await readMediaState(page);

      return state !== null && !state.paused;
    }, 'the track did not start playing');
    await page.getByLabel(/^Now playing:/).click();

    // Add a marker at the playhead.
    await page.getByLabel('Forward 15 seconds').click();
    await waitUntil(
      async () =>
        ((await readMediaState(page))?.currentTime ?? 0) > SEEK_FORWARD_S - 1,
      'the seek did not move the playhead',
    );
    // Wait for the sheet's own clock to show the new position: "Add marker
    // here" uses it, and it trails the player by a moment after a seek.
    await page
      .getByText(/^0:1[5-9]$/)
      .first()
      .waitFor({ timeout: WAIT_MS });
    await sheetMenu('Add marker here');
    await page.getByText('Added Marker 1').waitFor({ timeout: WAIT_MS });
    await waitUntil(
      async () => (await markerNames()) === 'Verse,Marker 1,Chorus',
      `the new marker was not saved between Verse and Chorus (saved: ${JSON.stringify(await savedMarkers())})`,
    );

    const added = (await savedMarkers()).find(
      ({ name }) => name === 'Marker 1',
    );

    if (
      !added ||
      added.positionMs < ADDED_MIN_MS ||
      added.positionMs > ADDED_MAX_MS
    ) {
      throw new Error(
        `the marker is at ${added?.positionMs} ms, not at the playhead`,
      );
    }

    await shot('1-marker-added');
    pass('Add marker here saves a marker at the playhead, in position order');

    // Rename it from the confirmation.
    await page.getByText('Rename', { exact: true }).click();
    await page.getByRole('textbox').last().fill('Bridge');
    await page.getByText('Save', { exact: true }).last().click();
    await waitUntil(
      async () => (await markerNames()) === 'Verse,Bridge,Chorus',
      'the new name was not saved',
    );
    pass('Rename from the confirmation changes the marker name');

    // The manager lists them in order; tapping a row jumps there.
    await sheetMenu('Markers');
    await page.getByText('Markers for Alto Part').waitFor({ timeout: WAIT_MS });
    await shot('2-markers-list');
    await page.getByLabel('Chorus, 0:30.0').last().click();
    await waitUntil(
      async () =>
        Math.abs(((await readMediaState(page))?.currentTime ?? 0) - 30) <
        JUMP_TOLERANCE_S,
      'tapping a marker did not jump the player to it',
    );
    pass('Tapping a marker row jumps playback to it');

    // A loop from one marker to the next.
    const bridge = (await savedMarkers()).find(({ name }) => name === 'Bridge');

    await page.getByLabel('Actions for Verse').click();
    await page.getByText('Loop to next marker', { exact: true }).click();
    await page
      .getByText('NEW LOOP', { exact: false })
      .waitFor({ timeout: WAIT_MS });
    await page.getByText('0:12.0').first().waitFor({ timeout: WAIT_MS });
    await page.getByText('Save loop', { exact: true }).click();
    await waitUntil(async () => {
      const loops = (await session.readStored<StoredLoop[]>(LOOPS_KEY)) ?? [];

      return loops.some(
        ({ endMs, startMs }) =>
          startMs === 12_000 &&
          Math.abs(endMs - (bridge?.positionMs ?? 0)) < 100,
      );
    }, 'the loop from Verse to Bridge was not saved');
    pass('Loop to next marker makes a loop from this marker to the next');

    // Delete one.
    await sheetMenu('Markers');
    await page.getByLabel('Actions for Bridge').click();
    await page.getByText('Delete', { exact: true }).click();
    await waitUntil(
      async () => (await markerNames()) === 'Verse,Chorus',
      'the deleted marker is still saved',
    );
    await shot('3-marker-deleted');
    pass('Delete removes the marker and keeps the others');
  },
});
