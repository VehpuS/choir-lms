import type { Locator, Page } from 'playwright';

import {
  buildMockComposite,
  buildMockLyrics,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { settledBox } from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// Issue #46, Part 2 (task 3.4): in a wide, short window the playback view is
// one sheet in two columns. The left keeps what you play with (transport,
// speed and pitch); the right shows one panel at a time (Lyrics, a composite's
// Mix, the queue, speed & pitch) chosen by tabs, so changing panel never moves
// the transport. Upright it is still the bottom sheet that switches surfaces.
const LANDSCAPE = { height: 390, width: 844 };
const PORTRAIT = { height: 844, width: 390 };
const WAIT_MS = 5000;
const TONE_SECONDS = 30;
const POSITION_TOLERANCE = 1;

const alto = buildMockSource('Alto Part', {
  durationMs: TONE_SECONDS * 1000,
  lyrics: buildMockLyrics('Kyrie eleison\nChriste eleison'),
});
const soprano = buildMockSource('Soprano Part', {
  durationMs: TONE_SECONDS * 1000,
});
const tenor = buildMockSource('Tenor Part', {
  durationMs: TONE_SECONDS * 1000,
});
const kyrie = buildMockComposite('Kyrie mix', [
  { mine: true, source: soprano },
  { source: alto },
]);
const tone = buildToneMedia({ seconds: TONE_SECONDS });

const tab = (page: Page, name: string) =>
  page.getByRole('button', { exact: true, name });

const boxOf = async (target: Locator, name: string) => {
  const box = await target.boundingBox();

  if (!box) {
    throw new Error(`${name} is not on screen`);
  }

  return box;
};

const isPlaying = (page: Page) =>
  waitUntil(async () => {
    const state = await readMediaState(page);

    return state !== null && !state.paused;
  }, 'the track did not start playing');

void runScenario({
  drive: {
    media: Object.fromEntries(
      [alto, soprano, tenor].map((source) => [source.driveFileId, tone]),
    ),
    state: 'authorized',
  },
  library: {
    composites: [kyrie],
    playlists: [],
    sources: [alto, soprano, tenor],
  },
  mediaProbe: true,
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await page.setViewportSize(LANDSCAPE);
    await page.getByText('Tracks', { exact: true }).first().click();
    await page.getByText('Play all', { exact: true }).click();
    await isPlaying(page);
    await page.getByLabel(/^Now playing:/).click();
    await tab(page, 'Speed & pitch').waitFor({ timeout: WAIT_MS });
    await shot('1-two-columns');

    // The left column: transport, speed and pitch, in view without scrolling.
    const forward = page.getByLabel('Forward 15 seconds');
    const speedTile = page.getByLabel(/^Speed .*Open speed and pitch/);

    for (const [target, name] of [
      [page.getByLabel('Back 15 seconds'), 'Back 15 seconds'],
      [forward, 'Forward 15 seconds'],
      [speedTile, 'the Speed tile'],
      [page.getByLabel(/^Pitch .*Open speed and pitch/), 'the Pitch tile'],
    ] as const) {
      // The sheet slides in with a spring: measure once it has stopped.
      const box = await settledBox(target);

      if (!box) {
        throw new Error(`${name} is not on screen`);
      }

      if (box.x + box.width > LANDSCAPE.width / 2) {
        throw new Error(
          `${name} is not in the left column (right edge ${Math.round(box.x + box.width)})`,
        );
      }

      if (box.y + box.height > LANDSCAPE.height) {
        throw new Error(
          `${name} is below the fold (bottom ${Math.round(box.y + box.height)})`,
        );
      }
    }

    // The tabs are in the right column.
    for (const name of ['Lyrics', 'Queue', 'Speed & pitch']) {
      const box = await boxOf(tab(page, name), `the ${name} tab`);

      if (box.x < LANDSCAPE.width / 2) {
        throw new Error(`the ${name} tab is not in the right column`);
      }
    }

    pass(
      'Landscape shows the transport and speed and pitch on the left and the tabs on the right',
    );

    // Changing tab changes only the right column.
    // The sheet slides in with a spring: measure once it has stopped.
    const transport = await settledBox(forward);

    if (!transport) {
      throw new Error('the transport is not on screen');
    }

    const expectTransportStill = async (during: string) => {
      const now = await boxOf(forward, 'Forward 15 seconds');

      if (
        Math.abs(now.x - transport.x) > POSITION_TOLERANCE ||
        Math.abs(now.y - transport.y) > POSITION_TOLERANCE
      ) {
        throw new Error(
          `the transport moved while showing ${during}: (${transport.x}, ${transport.y}) to (${now.x}, ${now.y})`,
        );
      }
    };

    await tab(page, 'Queue').click();
    await page
      .getByText('Soprano Part', { exact: true })
      .first()
      .waitFor({ timeout: WAIT_MS });
    await page
      .getByText('Ordered', { exact: true })
      .first()
      .waitFor({ timeout: WAIT_MS });
    // The playlist actions scroll with the list, so three rows fit in view: the
    // third row is what you would touch at its centre, not covered by a footer
    // or cut off by the panel's edge.
    const thirdRow = page.getByText('Tenor Part', { exact: true }).last();

    await settledBox(thirdRow);

    const isTouchable = await thirdRow.evaluate((row) => {
      const box = row.getBoundingClientRect();
      const hit = document.elementFromPoint(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );

      return (
        box.bottom <= window.innerHeight &&
        hit !== null &&
        (row === hit || row.contains(hit) || hit.contains(row))
      );
    });

    if (!isTouchable) {
      throw new Error('the third queue row is covered or cut off');
    }

    await shot('2-queue-tab');
    await expectTransportStill('the queue');
    if ((await page.getByLabel('Dismiss queue').count()) !== 0) {
      throw new Error('the queue tab shows the compact sheet header');
    }

    await tab(page, 'Speed & pitch').click();
    await page
      .getByText(/Applies to this session only/)
      .waitFor({ timeout: WAIT_MS });
    await shot('3-speed-pitch-tab');
    await expectTransportStill('speed and pitch');

    await tab(page, 'Lyrics').click();
    await page
      .getByText('Edit', { exact: true })
      .first()
      .waitFor({ timeout: WAIT_MS });
    await expectTransportStill('the lyrics');
    pass(
      'Switching between Lyrics, Queue and Speed & pitch leaves the transport where it is',
    );

    // The speed tile on the left opens the Speed & pitch tab.
    await speedTile.click();
    await page
      .getByText(/Applies to this session only/)
      .waitFor({ timeout: WAIT_MS });
    pass('The speed tile opens the Speed & pitch tab');

    // Playback keeps going and the view closes as before.
    await isPlaying(page);
    await page.getByLabel('Dismiss playback').click();
    await page
      .getByLabel('Dismiss playback')
      .waitFor({ state: 'detached', timeout: WAIT_MS });

    // A composite adds a Mix tab, with the stems in the right column.
    await page.getByText('Composites', { exact: true }).first().click();
    await page.getByText('Kyrie mix', { exact: true }).first().click();
    await waitUntil(
      async () =>
        (await page.getByLabel(/^Now playing: Kyrie mix/).count()) > 0,
      'the composite did not start',
    );
    await page.getByLabel(/^Now playing: Kyrie mix/).click();
    await tab(page, 'Mix').click();
    const mute = page.getByLabel('Mute Soprano Part');

    await mute.waitFor({ timeout: WAIT_MS });
    if ((await boxOf(mute, 'the Mute button')).x < LANDSCAPE.width / 2) {
      throw new Error('the Mix panel is not in the right column');
    }

    await shot('4-mix-tab');
    pass('A composite adds a Mix tab with its stems in the right column');
    await page.getByLabel('Dismiss playback').click();
    await page
      .getByLabel('Dismiss playback')
      .waitFor({ state: 'detached', timeout: WAIT_MS });

    // Upright: the bottom sheet, switched by its own buttons, with no tabs.
    await page.setViewportSize(PORTRAIT);
    // The layout changes after the resize: wait for the mini-player band.
    await waitUntil(async () => {
      const box = await page.getByLabel(/^Now playing:/).boundingBox();

      return box !== null && box.y > PORTRAIT.height / 2;
    }, 'the mini-player band did not return');
    await page.getByLabel(/^Now playing:/).click();
    await page.getByLabel('Dismiss playback').waitFor({ timeout: WAIT_MS });
    if ((await tab(page, 'Speed & pitch').count()) !== 0) {
      throw new Error('upright shows the landscape tabs');
    }

    await shot('5-portrait-sheet');
    pass('Upright keeps the bottom sheet without tabs');
  },
  viewport: PORTRAIT,
});
