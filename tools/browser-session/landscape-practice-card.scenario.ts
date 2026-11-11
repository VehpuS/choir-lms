import type { Locator, Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { WAIT_MS } from './piano-helpers';
import { settledBox } from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// Issue #46, follow-up F.4: over the two-column playback view in the
// wide-short layout, Pitch and Recording are one small floating card in the
// lower trailing corner (not full-width strips that squeeze the sheet). The
// card is dragged by its header, kept inside the window, and collapses to a
// pill that stays where the card was. Chosen from `mockups/f4-*.html`, option B.
const LANDSCAPE = { height: 390, width: 844 };
const TONE_SECONDS = 30;
const TOLERANCE = 3;
const CARD_MIN_WIDTH = 240;
const CARD_MAX_WIDTH = 300;
const CORNER_REACH = 40;
const DRAG = { x: -300, y: -120 };
const FAR_DRAG = 3000;

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

const boxOf = async (target: Locator, name: string) => {
  const box = await settledBox(target);

  if (!box) {
    throw new Error(`${name} is not on screen`);
  }

  return box;
};

const isReachable = (target: Locator) =>
  target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
    );

    return hit !== null && (element.contains(hit) || hit.contains(element));
  });

const turnOn = async (page: Page, label: string) => {
  await page.getByLabel('Playback practice tools').click();
  await page.getByLabel(`${label}, off`).click();
  await page.getByLabel(`${label}, on`).waitFor({ timeout: WAIT_MS });
  // Escape closes the menu (tapping outside it does not in the playback view: F.6).
  await page.keyboard.press('Escape');
  await page
    .getByLabel(`${label}, on`)
    .waitFor({ state: 'detached', timeout: WAIT_MS });
};

const dragBy = async (page: Page, handle: Locator, dx: number, dy: number) => {
  const box = await boxOf(handle, 'the drag handle');
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx / 2, startY + dy / 2, { steps: 4 });
  await page.mouse.move(startX + dx, startY + dy, { steps: 4 });
  await page.mouse.up();
};

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
    await waitUntil(
      async () => (await readMediaState(page))?.paused === false,
      'the track did not play',
    );
    await page.setViewportSize(LANDSCAPE);
    await page.getByTestId('now-playing-pane').waitFor({ timeout: WAIT_MS });
    await page.getByLabel(/^Now playing:/).click();

    const toolsButton = page.getByLabel('Playback practice tools');
    const speedTile = page.getByText('Speed', { exact: true }).first();

    await toolsButton.waitFor({ timeout: WAIT_MS });
    const toolsBefore = await boxOf(toolsButton, 'the tools button');
    const speedBefore = await boxOf(speedTile, 'the speed tile');

    // Pitch: a small card in the lower trailing corner, not a strip.
    await turnOn(page, 'Pitch detection');
    const card = page.getByTestId('practice-tools-card');

    await card.waitFor({ timeout: WAIT_MS });
    const first = await boxOf(card, 'the card');

    if (first.width < CARD_MIN_WIDTH || first.width > CARD_MAX_WIDTH) {
      throw new Error(`the card is ${Math.round(first.width)} points wide`);
    }

    if (
      first.x + first.width < LANDSCAPE.width - CORNER_REACH - 60 ||
      first.y + first.height < LANDSCAPE.height - CORNER_REACH
    ) {
      throw new Error('the card does not start in the lower trailing corner');
    }

    const monitor = await boxOf(
      page.getByLabel('Pitch monitor'),
      'the monitor',
    );

    if (monitor.width > CARD_MAX_WIDTH) {
      throw new Error('the pitch monitor is a full-width strip');
    }

    const toolsAfter = await boxOf(toolsButton, 'the tools button');
    const speedAfter = await boxOf(speedTile, 'the speed tile');

    if (
      Math.abs(toolsAfter.y - toolsBefore.y) > TOLERANCE ||
      Math.abs(speedAfter.y - speedBefore.y) > TOLERANCE
    ) {
      throw new Error('the playback view was squeezed by the card');
    }

    await shot('1-card');
    pass(
      'Pitch opens as a small card in the corner and the sheet keeps its height',
    );

    // Recording joins the same card.
    await turnOn(page, 'Recording');
    const record = card.getByText('Record', { exact: true }).first();

    await record.waitFor({ timeout: WAIT_MS });
    // With the first-time headphones note the card scrolls inside itself.
    await record.scrollIntoViewIfNeeded();

    if (!(await isReachable(record))) {
      throw new Error('the Record button is covered');
    }

    await shot('2-pitch-and-recording');
    pass('Recording stacks in the same card and Record is reachable');

    // Drag by the header: it moves by the drag, then stays inside the window.
    const handle = page.getByLabel('Move practice tools');
    const before = await boxOf(card, 'the card');

    await dragBy(page, handle, DRAG.x, DRAG.y);
    const moved = await boxOf(card, 'the card');

    if (
      Math.abs(moved.x - (before.x + DRAG.x)) > TOLERANCE * 2 ||
      Math.abs(moved.y - (before.y + DRAG.y)) > TOLERANCE * 2
    ) {
      throw new Error(
        `the card moved to (${Math.round(moved.x)}, ${Math.round(moved.y)}), expected about (${Math.round(before.x + DRAG.x)}, ${Math.round(before.y + DRAG.y)})`,
      );
    }

    await dragBy(page, handle, -FAR_DRAG, -FAR_DRAG);
    const corner = await boxOf(card, 'the card');

    if (
      corner.x < -TOLERANCE ||
      corner.y < -TOLERANCE ||
      corner.x > 120 ||
      corner.y > 120
    ) {
      throw new Error(
        `the card left the window or stopped short (${Math.round(corner.x)}, ${Math.round(corner.y)})`,
      );
    }

    await shot('3-dragged-to-corner');
    await dragBy(page, handle, FAR_DRAG, FAR_DRAG);
    const far = await boxOf(card, 'the card');

    if (
      far.x + far.width > LANDSCAPE.width + TOLERANCE ||
      far.y + far.height > LANDSCAPE.height + TOLERANCE
    ) {
      throw new Error('the card was dragged out of the window');
    }

    pass('The card drags by its header and stays inside the window');

    // Collapse to a pill where the card was; expand to the same place.
    await page.getByLabel('Collapse practice tools').click();
    const pill = page.getByLabel('Expand practice tools');

    await pill.waitFor({ timeout: WAIT_MS });

    if (await isReachable(record)) {
      throw new Error('the card body is still reachable while collapsed');
    }

    const pillBox = await boxOf(pill, 'the pill');

    if (
      Math.abs(pillBox.x + pillBox.width - (far.x + far.width)) >
        TOLERANCE * 2 ||
      Math.abs(pillBox.y + pillBox.height - (far.y + far.height)) >
        TOLERANCE * 2
    ) {
      throw new Error('the pill is not anchored where the card was');
    }

    await shot('4-pill');
    await pill.click();
    await card.waitFor({ timeout: WAIT_MS });
    const back = await boxOf(card, 'the card');

    if (
      Math.abs(back.x - far.x) > TOLERANCE * 2 ||
      Math.abs(back.y - far.y) > TOLERANCE * 2
    ) {
      throw new Error('the card did not come back where it was');
    }

    pass('The card collapses to a pill in place and expands back');
  },
  viewport: LANDSCAPE,
});
