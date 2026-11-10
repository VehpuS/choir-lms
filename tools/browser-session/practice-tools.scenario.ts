import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Practice tools: the bottom tab's menu (Piano, Pitch detection, Recording), the
// piano keyboard it opens, and that with a track playing the playback screen's
// own button has a distinct name ("Playback practice tools") from the tab.
const WAIT_MS = 5000;
const TONE_SECONDS = 20;
const PIANO_CONTROLS = [
  'Piano volume',
  'Key width',
  'Piano height',
  'Piano position',
];

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');

    // The tab opens a menu with one toggle per tool, all off.
    await page.getByLabel('Practice tools', { exact: true }).click();
    for (const row of [
      'Piano, off',
      'Pitch detection, off',
      'Recording, off',
    ]) {
      await page.getByLabel(row).waitFor({ timeout: WAIT_MS });
    }
    await shot('1-tab-menu');
    pass(
      'The Practice tools tab lists Piano, Pitch detection and Recording, all off',
    );

    // Piano on: the keyboard and its controls appear.
    await page.getByLabel('Piano, off').click();
    await page.getByLabel('Piano, on').waitFor({ timeout: WAIT_MS });
    for (const control of PIANO_CONTROLS) {
      await page.getByLabel(control).waitFor({ timeout: WAIT_MS });
    }
    await shot('2-piano-on');
    pass(
      'Turning Piano on opens the keyboard with its volume, width, height and position controls',
    );

    // Closing the keyboard turns the tool off again (the menu sits over it, so
    // close the menu first and open it again to read the state).
    await page.getByLabel('Close practice tools').first().click();
    await page.getByLabel('Close piano').click();
    await page
      .getByLabel('Piano volume')
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    await page.getByLabel('Practice tools', { exact: true }).click();
    await page.getByLabel('Piano, off').waitFor({ timeout: WAIT_MS });
    await shot('3-piano-closed');
    pass('Close piano hides the keyboard and the menu shows Piano off');
    await page.getByLabel('Close practice tools').first().click();

    // With a track playing, the tab and the playback screen's button are two
    // distinctly named controls for the same menu.
    await page.getByLabel('Play Alto Part').first().click();
    await waitUntil(async () => {
      const state = await readMediaState(page);

      return state !== null && !state.paused;
    }, 'the track did not start playing');
    await page.getByLabel(/^Now playing:/).click();
    await page
      .getByLabel('Playback practice tools')
      .waitFor({ timeout: WAIT_MS });
    const tabs = await page
      .getByLabel('Practice tools', { exact: true })
      .count();

    if (tabs !== 1) {
      throw new Error(`expected one "Practice tools" control, found ${tabs}`);
    }

    await page.getByLabel('Playback practice tools').click();
    await page.getByLabel('Piano, off').click();
    await page.getByLabel('Piano volume').waitFor({ timeout: WAIT_MS });
    await shot('4-piano-from-playback');
    pass(
      'The playback screen has its own "Playback practice tools" button, and it opens the same piano',
    );
  },
});
