import type { Locator, Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { LANDSCAPE_PROFILES, type DeviceProfile } from './device-profiles';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { settledBox } from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// Issue #46, Part 2 (task 3.8): the wide-short layout on emulated phones on
// their side (see `LANDSCAPE_PROFILES`): real viewports, touch input and pixel
// ratios rather than a resized desktop window. Navigation by the rail, the Now
// Playing pane, and the practice tools (the trailing panel, the compact piano,
// piano full screen), all driven by taps. Chromium's emulation: it says nothing
// about Safari's own behaviour (that needs WebKit or a device).
const WAIT_MS = 5000;
const TONE_SECONDS = 30;
const RAIL_MAX_RIGHT = 120;
const PANEL_MIN_LEFT_FRACTION = 0.5;
const TOLERANCE = 3;
const FULL_SCREEN_BAR = 40;
const COMPACT_KEYS = 104;

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

const boxOf = async (target: Locator, name: string) => {
  const box = await settledBox(target);

  if (!box) {
    throw new Error(`${name} is not on screen`);
  }

  return box;
};

const tapTool = async (page: Page, label: string) => {
  await page.getByLabel('Practice tools', { exact: true }).tap();
  await page.getByLabel(label).tap();
};

const runOnProfile = (profile: DeviceProfile) =>
  runScenario({
    drive: {
      media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
      state: 'authorized',
    },
    library: { playlists: [], sources: [alto] },
    mediaProbe: true,
    microphone: true,
    profile,
    steps: async ({ page, pass, shot }) => {
      const viewport = page.viewportSize();

      if (!viewport) {
        throw new Error('the profile has no viewport');
      }

      await waitForTrack(page, 'Alto Part');

      // Navigation by the rail: four entries on the leading edge, no bottom tabs.
      const library = page.getByRole('button', {
        exact: true,
        name: 'Library',
      });
      const libraryBox = await boxOf(library, 'the Library entry');

      if (libraryBox.x + libraryBox.width > RAIL_MAX_RIGHT) {
        throw new Error(`${profile.name}: no side rail`);
      }

      await page.getByRole('button', { exact: true, name: 'Recents' }).tap();
      await page
        .getByText('Recent rehearsal entry points')
        .first()
        .waitFor({ timeout: WAIT_MS });
      await library.tap();
      await waitForTrack(page, 'Alto Part');
      await shot(`${profile.name}-1-rail`);
      pass(`${profile.name}: the rail switches screens by tap`);

      // The pane: play a track, see the pane at the trailing edge, pause it.
      await page.getByLabel('Play Alto Part').first().tap();
      await waitUntil(
        async () => (await readMediaState(page))?.paused === false,
        'the track did not play',
      );
      const pane = page.getByTestId('now-playing-pane');
      const paneBox = await boxOf(pane, 'the Now Playing pane');

      if (paneBox.x < viewport.width * PANEL_MIN_LEFT_FRACTION) {
        throw new Error(
          `${profile.name}: the pane is not on the trailing side`,
        );
      }

      await page
        .getByLabel(/^Pause/)
        .last()
        .tap();
      await waitUntil(
        async () => (await readMediaState(page))?.paused === true,
        'the pane did not pause the track',
      );
      pass(
        `${profile.name}: the pane sits at the trailing edge and pauses the track`,
      );

      // Pitch: the trailing panel takes the pane's place.
      await tapTool(page, 'Pitch detection, off');
      await page.getByLabel('Close practice tools').first().tap();
      await page.getByLabel('Pitch monitor').waitFor({ timeout: WAIT_MS });
      const monitor = await boxOf(
        page.getByLabel('Pitch monitor'),
        'the monitor',
      );

      if (monitor.x < viewport.width * PANEL_MIN_LEFT_FRACTION) {
        throw new Error(
          `${profile.name}: the pitch monitor is not a trailing panel`,
        );
      }

      await shot(`${profile.name}-2-pitch-panel`);
      pass(`${profile.name}: pitch opens in the trailing panel`);

      // Piano: the compact keyboard, then full screen and back.
      await tapTool(page, 'Piano, off');
      await page.getByLabel('Close practice tools').first().tap();
      const keys = await boxOf(
        page.getByTestId('piano-keyboard'),
        'the keyboard',
      );

      if (
        Math.abs(keys.height - COMPACT_KEYS) > TOLERANCE ||
        Math.abs(keys.y + keys.height - viewport.height) > TOLERANCE
      ) {
        throw new Error(
          `${profile.name}: the compact keyboard is not 104 points at the bottom`,
        );
      }

      await page.getByLabel('Full screen').tap();
      await page.getByLabel('Exit full screen').waitFor({ timeout: WAIT_MS });
      const full = await boxOf(
        page.getByTestId('piano-keyboard'),
        'the keyboard',
      );

      if (
        Math.abs(full.height - (viewport.height - FULL_SCREEN_BAR)) > TOLERANCE
      ) {
        throw new Error(
          `${profile.name}: full screen keys are ${Math.round(full.height)} high`,
        );
      }

      await shot(`${profile.name}-3-full-screen`);
      await page.getByLabel('Exit full screen').tap();
      await page.getByTestId('piano-keyboard').waitFor({ timeout: WAIT_MS });
      pass(`${profile.name}: the piano goes full screen and back by tap`);
    },
  });

void (async () => {
  for (const profile of LANDSCAPE_PROFILES) {
    await runOnProfile(profile);
  }
})();
