import type { Locator, Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Issue #46, Part 2 (task 3.2): in a wide, short window (a phone on its side)
// the bottom tabs become a side rail with the same four entries, and the
// Library's floating `+` becomes a header action so it never covers a row.
// Turning the window upright brings the bottom tabs and the floating `+` back.
const LANDSCAPE = { height: 390, width: 844 };
const PORTRAIT = { height: 844, width: 390 };
const WAIT_MS = 5000;
const RAIL_MAX_RIGHT = 120;
const HEADER_MAX_BOTTOM = 130;
const BAND_HEIGHT = 60;

const TONE_SECONDS = 30;
const PANE_WIDTH = 280;
const PANE_TOLERANCE = 20;

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });
const nowPlaying = (page: Page) => page.getByLabel(/^Now playing:/);

const isPlaying = (page: Page, expected: boolean) =>
  waitUntil(
    async () => (await readMediaState(page))?.paused === !expected,
    expected ? 'the track did not play' : 'the track did not pause',
  );

const entry = (page: Page, name: string) =>
  name === 'Practice tools'
    ? page.getByLabel('Practice tools', { exact: true })
    : page.getByRole('button', { exact: true, name });

const createButton = (page: Page) => page.getByLabel(/^Create in /);

const boxOf = async (target: Locator, name: string) => {
  const box = await target.boundingBox();

  if (!box) {
    throw new Error(`${name} is not on screen`);
  }

  return box;
};

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await page.setViewportSize(LANDSCAPE);
    await waitUntil(
      async () => (await page.viewportSize())?.width === LANDSCAPE.width,
      'the window did not turn landscape',
    );

    // The layout changes after the resize has been seen, so wait for the rail.
    await waitUntil(async () => {
      const box = await entry(page, 'Library').boundingBox();

      return box !== null && box.x + box.width <= RAIL_MAX_RIGHT;
    }, 'the side rail did not appear');

    // The rail: four entries stacked on the leading edge, no bottom tab bar.
    const names = ['Library', 'Add', 'Recents', 'Practice tools'];
    let previousTop = -1;

    for (const name of names) {
      const box = await boxOf(entry(page, name), `the ${name} entry`);

      if (box.x + box.width > RAIL_MAX_RIGHT) {
        throw new Error(
          `the ${name} entry is not on the leading edge (right edge ${Math.round(box.x + box.width)})`,
        );
      }

      if (box.y <= previousTop) {
        throw new Error(`the ${name} entry is not below the one before it`);
      }

      previousTop = box.y;
    }

    await shot('1-rail');
    pass('Landscape shows a side rail with the four entries stacked');

    // Choosing an entry changes the screen, as the bottom tabs do.
    await entry(page, 'Add').click();
    await page
      .getByText('My Drive', { exact: true })
      .first()
      .waitFor({ timeout: WAIT_MS });
    await entry(page, 'Recents').click();
    await page
      .getByText('Recent rehearsal entry points')
      .first()
      .waitFor({ timeout: WAIT_MS });
    await entry(page, 'Library').click();
    await waitForTrack(page, 'Alto Part');
    pass('The rail switches between Add, Recents and Library');

    // The Files `+` is a header action, and the floating one is gone.
    const create = page.getByLabel(/^Create in /);

    if ((await create.count()) !== 1) {
      throw new Error(
        `expected one Create button, found ${await create.count()}`,
      );
    }

    const createBox = await boxOf(create, 'the Create button');

    if (createBox.y + createBox.height > HEADER_MAX_BOTTOM) {
      throw new Error(
        `the Create button is not in the header (bottom ${Math.round(createBox.y + createBox.height)})`,
      );
    }

    await shot('2-header-create');
    await create.click();
    await page
      .getByText('Create folder', { exact: true })
      .waitFor({ timeout: WAIT_MS });
    await page.getByText('Cancel', { exact: true }).last().click();
    pass('The Files Create button is in the header and opens the create menu');

    // The Playlists `+` is in the header too and opens its dialog.
    await page.getByText('Playlists', { exact: true }).first().click();
    const createPlaylist = page.getByLabel('Create playlist');

    await createPlaylist.waitFor({ timeout: WAIT_MS });
    await createPlaylist.click();
    await page.getByRole('textbox').first().waitFor({ timeout: WAIT_MS });
    await shot('3-playlist-dialog');
    await page.getByText('Cancel', { exact: true }).last().click();
    pass('The Playlists Create button is in the header and opens its dialog');

    // Nothing playing: no pane, and the list keeps the whole width.
    await page.getByText('Files', { exact: true }).first().click();
    if ((await nowPlaying(page).count()) !== 0) {
      throw new Error('a Now Playing pane is shown while nothing plays');
    }

    const widthBefore = (await boxOf(createButton(page), 'the Create button'))
      .x;

    // Playing: the pane takes the trailing side and the content gives up its
    // width; the bottom mini-player band is gone.
    await page.getByLabel('Play Alto Part').first().click();
    await isPlaying(page, true);
    await nowPlaying(page).waitFor({ timeout: WAIT_MS });

    const pane = await boxOf(nowPlaying(page), 'the Now Playing pane');

    if (pane.x < LANDSCAPE.width - PANE_WIDTH - PANE_TOLERANCE) {
      throw new Error(
        `the pane is not on the trailing side (x ${Math.round(pane.x)})`,
      );
    }

    if (pane.y + pane.height > LANDSCAPE.height - BAND_HEIGHT) {
      throw new Error('the pane sits along the bottom like the mini-player');
    }

    await waitUntil(async () => {
      const box = await createButton(page).boundingBox();

      return box !== null && widthBefore - box.x >= PANE_WIDTH - PANE_TOLERANCE;
    }, 'the content did not give up the pane width');
    await shot('4-now-playing-pane');
    pass(
      'Playing shows the Now Playing pane on the trailing side; the list narrows',
    );

    // Browsing keeps the pane and the playback.
    await entry(page, 'Add').click();
    await page
      .getByText('My Drive', { exact: true })
      .first()
      .waitFor({ timeout: WAIT_MS });
    await entry(page, 'Recents').click();
    await entry(page, 'Library').click();
    await nowPlaying(page).waitFor({ timeout: WAIT_MS });
    await isPlaying(page, true);
    pass('The pane stays and playback continues while browsing');

    // The pane controls the playback, and its title opens the full view.
    await page.getByLabel('Pause Alto Part').last().click();
    await isPlaying(page, false);
    await page.getByLabel('Resume Alto Part').last().click();
    await isPlaying(page, true);
    await nowPlaying(page).click();
    await page.getByLabel('Dismiss playback').waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Dismiss playback').click();
    pass('The pane pauses and resumes playback, and opens the full view');

    // Practice tools open beside the rail, over the content.
    await entry(page, 'Practice tools').click();
    const piano = page.getByLabel('Piano, off');

    await piano.waitFor({ timeout: WAIT_MS });
    const pianoBox = await boxOf(piano, 'the Piano toggle');
    const railBox = await boxOf(
      entry(page, 'Practice tools'),
      'the rail entry',
    );

    if (pianoBox.x < railBox.x + railBox.width) {
      throw new Error(
        'the Practice tools menu is not to the right of the rail',
      );
    }

    await shot('4-practice-tools-menu');
    pass('The Practice tools menu opens to the right of the rail');
    await page.keyboard.press('Escape');

    // Upright again: bottom tabs and the floating `+` come back.
    await page.setViewportSize(PORTRAIT);
    await waitUntil(
      async () => (await page.viewportSize())?.width === PORTRAIT.width,
      'the window did not turn upright',
    );
    await page.getByText('Files', { exact: true }).first().click();
    await waitUntil(async () => {
      const box = await entry(page, 'Library').boundingBox();

      return box !== null && box.y > PORTRAIT.height / 2;
    }, 'the tabs did not return to the bottom');
    await waitUntil(async () => {
      const box = await page.getByLabel(/^Create in /).boundingBox();

      return box !== null && box.y > PORTRAIT.height / 2;
    }, 'the floating Create button did not return');
    await waitUntil(async () => {
      const box = await nowPlaying(page).boundingBox();

      return box !== null && box.y > PORTRAIT.height - 200;
    }, 'the mini-player did not return to the bottom');
    await shot('5-portrait');
    pass(
      'Turning the window upright brings back the bottom tabs, the floating + and the mini-player band',
    );
  },
  viewport: PORTRAIT,
});
