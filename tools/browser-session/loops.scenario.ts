import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { openTrackMenu, waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Loops: make a loop from a track, set its range with the steppers, see it in
// Files (under its track) and in Loops, edit its range, and play it from its
// start (read off the player's media element). Each change is checked on
// screen and in what the app saved.
const OWNER = 'local-device-user';
const LOOPS_KEY = `choirlms:practice:loops:${OWNER}`;
const WAIT_MS = 5000;
const TONE_SECONDS = 20;
const STEP_PRESSES = 4;
// The steppers move by a quarter second, so four presses are one second.
const ONE_SECOND_MS = 1000;
const TOLERANCE_S = 0.2;
// A track playing from the start has barely moved when first seen.
const WHOLE_TRACK_START_LIMIT_S = 1.5;

type StoredLoop = { endMs: number; name: string; startMs: number };

const alto = buildMockSource('Alto Part', {
  durationMs: TONE_SECONDS * ONE_SECOND_MS,
});

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  steps: async ({ page, pass, session, shot }) => {
    const savedLoops = async () =>
      (await session.readStored<StoredLoop[]>(LOOPS_KEY)) ?? [];
    const press = async (label: string, times: number) => {
      for (let press = 0; press < times; press += 1) {
        await page.getByLabel(label).click();
      }
    };

    await waitForTrack(page, 'Alto Part');

    // Make a loop: the editor opens on the whole track.
    await openTrackMenu(page, 'Alto Part');
    await page.getByText('Make loop', { exact: true }).click();
    await page
      .getByText('NEW LOOP', { exact: false })
      .waitFor({ timeout: WAIT_MS });
    await page.getByText('0:20.0').first().waitFor({ timeout: WAIT_MS });
    await shot('1-loop-editor');
    pass('Make loop opens the editor on the whole track');

    // Trim one second from each end, name it, and save.
    await press('Move loop start later', STEP_PRESSES);
    await press('Move loop end earlier', STEP_PRESSES);
    await page.getByText('0:01.0').first().waitFor({ timeout: WAIT_MS });
    await page.getByText('0:19.0').first().waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Loop name').fill('Verse five');
    await page.getByText('Save loop', { exact: true }).click();
    await waitUntil(
      async () =>
        (await savedLoops()).some(
          ({ endMs, name, startMs }) =>
            name === 'Verse five' && startMs === 1000 && endMs === 19_000,
        ),
      'the loop was not saved with its range',
    );
    pass('Save loop stores the name and the trimmed range (1 s to 19 s)');

    // It shows under its track in Files, and in the Loops list.
    await page.getByText('0:20 · 1 loop').waitFor({ timeout: WAIT_MS });
    await shot('2-loop-under-track');
    pass('The track row in Files shows its loop');

    await page
      .getByText('Dismiss', { exact: true })
      .click()
      .catch(() => undefined);
    await page.getByText('Loops', { exact: true }).first().click();
    await page.getByText('0:01–0:19 · Alto Part').waitFor({ timeout: WAIT_MS });
    pass('The Loops list shows it with its range');

    // Edit the range.
    await page.getByLabel('Verse five options').click();
    await page.getByText('Edit loop', { exact: true }).click();
    await page
      .getByText('EDIT LOOP', { exact: false })
      .waitFor({ timeout: WAIT_MS });
    await press('Move loop start later', STEP_PRESSES);
    await page.getByText('0:02.0').first().waitFor({ timeout: WAIT_MS });
    await page.getByText('Save changes', { exact: true }).click();
    await waitUntil(
      async () => (await savedLoops())[0]?.startMs === 2000,
      'the edited range was not saved',
    );
    await page.getByText('0:02–0:19 · Alto Part').waitFor({ timeout: WAIT_MS });
    await shot('3-loop-edited');
    pass('Edit loop changes the range and saves it');

    // Control: the whole track starts at zero, so the probe tells the two apart.
    await page.getByText('Tracks', { exact: true }).first().click();
    await page.getByText('Play all', { exact: true }).click();
    await waitUntil(async () => {
      const state = await readMediaState(page);

      return state !== null && !state.paused && state.currentTime > 0;
    }, 'the track did not start playing');
    const whole = await readMediaState(page);

    if (!whole || whole.currentTime > WHOLE_TRACK_START_LIMIT_S) {
      throw new Error(`the whole track started at ${whole?.currentTime}s`);
    }

    pass('The whole track starts near zero (the control for the next check)');

    await page.getByText('Loops', { exact: true }).first().click();

    // Playing the loop starts at the loop start, not the start of the track.
    await page.getByLabel('Play Verse five').click();
    await page
      .getByText('Playing · Loop from Alto Part')
      .first()
      .waitFor({ timeout: 10_000 });
    await waitUntil(async () => {
      const state = await readMediaState(page);

      return state !== null && !state.paused && state.currentTime > 0;
    }, 'the loop did not start playing');

    const state = await readMediaState(page);
    const startSeconds = 2;
    const endSeconds = 19.75;

    if (
      !state ||
      state.currentTime < startSeconds - TOLERANCE_S ||
      state.currentTime > endSeconds
    ) {
      throw new Error(
        `the loop played from ${state?.currentTime}s, not from its start (${startSeconds}s)`,
      );
    }

    await shot('4-loop-playing');
    pass('Playing the loop starts at its start position');
  },
});
