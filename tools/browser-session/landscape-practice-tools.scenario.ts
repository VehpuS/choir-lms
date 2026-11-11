import type { Locator, Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { settledBox } from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// Issue #46, Part 2 (task 3.5): in the wide-short layout (a phone on its side)
// pitch and recording open in a trailing panel that takes the Now Playing
// pane's place, and the piano is a compact keyboard at the bottom of the
// content area, so none of them covers the header or the add button. Upright
// keeps the strips above the mini-player exactly as before.
const LANDSCAPE = { height: 390, width: 844 };
const PORTRAIT = { height: 844, width: 390 };
const WAIT_MS = 5000;
const TONE_SECONDS = 30;
const PANEL_MAX_WIDTH = 300;
const PANEL_MIN_LEFT = 500;
const PIANO_KEYS_HEIGHT = 104;
const PIANO_BAR_HEIGHT = 34;
const PIANO_UPRIGHT_KEYS_HEIGHT = 136;
const TOLERANCE = 3;
const RAIL_MAX_RIGHT = 120;

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

const tools = (page: Page) =>
  page.getByLabel('Practice tools', { exact: true });
const pane = (page: Page) => page.getByTestId('now-playing-pane');
const keyboard = (page: Page) => page.getByTestId('piano-keyboard');
const monitor = (page: Page) => page.getByLabel('Pitch monitor');
const recording = (page: Page) => page.getByLabel('Recording', { exact: true });

const boxOf = async (target: Locator, name: string) => {
  const box = await settledBox(target);

  if (!box) {
    throw new Error(`${name} is not on screen`);
  }

  return box;
};

/** Whether the browser would deliver a touch at the element's centre to it. */
const isReachable = (target: Locator) =>
  target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
    );

    return hit !== null && (element.contains(hit) || hit.contains(element));
  });

const expectReachable = async (target: Locator, name: string) => {
  if (!(await isReachable(target))) {
    throw new Error(`${name} is covered by something else`);
  }
};

const toggleTool = async (page: Page, label: string, from: 'on' | 'off') => {
  await tools(page).click();
  await page.getByLabel(`${label}, ${from}`).click();
  await page
    .getByLabel(`${label}, ${from === 'on' ? 'off' : 'on'}`)
    .waitFor({ timeout: WAIT_MS });
  await page.getByLabel('Close practice tools').first().click();
};

const turnOn = (page: Page, label: string) => toggleTool(page, label, 'off');

const isPlaying = (page: Page) =>
  waitUntil(
    async () => (await readMediaState(page))?.paused === false,
    'the track did not keep playing',
  );

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  microphone: true,
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await page.getByLabel('Play Alto Part').first().click();
    await isPlaying(page);
    await page.setViewportSize(LANDSCAPE);
    await pane(page).waitFor({ timeout: WAIT_MS });
    const library = page.getByText('Alto Part', { exact: true }).first();
    const rowBefore = await boxOf(library, 'the Alto Part row');

    // Pitch: the panel takes the pane's place, the list keeps its height.
    await turnOn(page, 'Pitch detection');
    await monitor(page).waitFor({ timeout: WAIT_MS });
    await pane(page).waitFor({ state: 'detached', timeout: WAIT_MS });
    const panel = await boxOf(monitor(page), 'the pitch monitor');

    if (panel.x < PANEL_MIN_LEFT || panel.width > PANEL_MAX_WIDTH) {
      throw new Error(
        `the pitch monitor is not a trailing panel (x ${Math.round(panel.x)}, width ${Math.round(panel.width)})`,
      );
    }

    if (Math.abs(panel.x + panel.width - LANDSCAPE.width) > TOLERANCE) {
      throw new Error('the pitch monitor does not reach the trailing edge');
    }

    const rowDuring = await boxOf(library, 'the Alto Part row');

    if (Math.abs(rowDuring.y - rowBefore.y) > TOLERANCE) {
      throw new Error('the list moved when the pitch monitor opened');
    }

    await isPlaying(page);
    await shot('1-pitch-panel');
    pass(
      'Pitch opens in a trailing panel in place of the pane; the list keeps its place and the track keeps playing',
    );

    // Recording joins it in the same panel.
    await turnOn(page, 'Recording');
    await recording(page).waitFor({ timeout: WAIT_MS });
    const strip = await boxOf(recording(page), 'the recording strip');

    if (strip.x < PANEL_MIN_LEFT || strip.width > PANEL_MAX_WIDTH) {
      throw new Error('the recording strip is not in the trailing panel');
    }

    for (const name of ['Record']) {
      await expectReachable(
        recording(page).getByText(name, { exact: true }).first(),
        `the ${name} button`,
      );
    }

    await shot('2-pitch-and-recording');
    pass('Recording stacks in the same panel and its buttons are reachable');

    // The account menu hangs from the header and is not covered by the panel.
    await page.getByLabel('Open Drive session menu').first().click();
    const settings = page.getByText('Settings', { exact: true }).first();

    await settings.waitFor({ timeout: WAIT_MS });
    // The card is taller than the window, so it scrolls inside itself.
    await settings.scrollIntoViewIfNeeded();
    await expectReachable(settings, 'the Settings menu row');
    const settingsBox = await boxOf(settings, 'the Settings menu row');

    if (settingsBox.y + settingsBox.height > LANDSCAPE.height) {
      throw new Error('the Settings menu row is below the window');
    }

    await shot('3-account-menu');
    pass(
      'The account menu scrolls inside the window and the tools do not cover it',
    );
    await page.keyboard.press('Escape');
    await settings.waitFor({ state: 'detached', timeout: WAIT_MS });

    // Closing both brings the pane back.
    await page.getByLabel('Close pitch detection').click();
    await toggleTool(page, 'Recording', 'on');
    await pane(page).waitFor({ timeout: WAIT_MS });
    await isPlaying(page);
    pass('Closing the tools brings the Now Playing pane back');

    // Piano: compact keyboard at the bottom, right of the rail.
    await turnOn(page, 'Piano');
    await keyboard(page).waitFor({ timeout: WAIT_MS });
    const keys = await boxOf(keyboard(page), 'the keyboard');

    if (
      Math.abs(keys.height - PIANO_KEYS_HEIGHT) > TOLERANCE ||
      Math.abs(keys.y + keys.height - LANDSCAPE.height) > TOLERANCE ||
      keys.x < RAIL_MAX_RIGHT - 40
    ) {
      throw new Error(
        `the keyboard is not compact at the bottom right of the rail (${JSON.stringify(keys)})`,
      );
    }

    const bar = await boxOf(page.getByLabel('Piano volume'), 'the volume');

    if (
      bar.y + bar.height > keys.y + TOLERANCE ||
      keys.y - bar.y > PIANO_BAR_HEIGHT * 2
    ) {
      throw new Error(
        'the piano controls are not in a slim bar above the keys',
      );
    }

    await expectReachable(
      page.getByLabel(/^Create in /),
      'the header add button',
    );
    await pane(page).waitFor({ timeout: WAIT_MS });
    await shot('4-piano');
    pass(
      'The piano is a 104-point keyboard with a slim bar; the header and pane stay',
    );

    // Everything open: the header and one row stay visible above the piano.
    await turnOn(page, 'Pitch detection');
    await turnOn(page, 'Recording');
    await monitor(page).waitFor({ timeout: WAIT_MS });
    await expectReachable(
      page.getByLabel(/^Create in /),
      'the header add button',
    );
    const row = await boxOf(library, 'the Alto Part row');
    const pianoTop = (await boxOf(page.getByLabel('Piano volume'), 'the bar'))
      .y;

    if (row.y + row.height > pianoTop) {
      throw new Error('no content row is visible above the piano');
    }

    await shot('5-all-tools');
    pass('With all three open the header and a content row stay visible');

    // Upright: the strips are back above the mini-player, full width.
    await page.setViewportSize(PORTRAIT);
    await waitUntil(async () => {
      const box = await monitor(page).boundingBox();

      return box !== null && box.width >= PORTRAIT.width - TOLERANCE;
    }, 'the pitch monitor is not a full-width strip upright');
    await page.getByLabel('Piano position').waitFor({ timeout: WAIT_MS });
    const upright = await boxOf(keyboard(page), 'the keyboard');

    if (Math.abs(upright.height - PIANO_UPRIGHT_KEYS_HEIGHT) > TOLERANCE) {
      throw new Error('the upright keyboard changed height');
    }

    if ((await page.getByLabel('Piano height').count()) !== 1) {
      throw new Error('the upright piano lost its height grabber');
    }

    await shot('6-upright');
    pass('Upright keeps the full-width strips and the grabber piano');
  },
});
