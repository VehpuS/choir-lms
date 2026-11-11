import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Guard for the layout classes (issue #46). Most scenarios run upright at
// 390 x 844, so they already catch a regression there; this one says it
// directly, at the sizes that matter: which layout each window gets, exactly at
// the thresholds, and that the hysteresis band holds in a real browser.
//
//   compact    bottom tabs along the bottom, the floating + over the list,
//              the mini-player band above the tabs
//   wide-short side rail on the leading edge, the + in the header, the Now
//              Playing pane on the trailing side
//
// A track plays throughout, so the mini-player or the pane is always there.
//
// Every slice that changes the wide-short layout adds what must stay the same
// upright here.
type Layout = 'compact' | 'wide-short';
type Size = { height: number; width: number };

const WAIT_MS = 5000;
const BOTTOM_EDGE_GAP = 60;
const RAIL_MAX_RIGHT = 120;
const HEADER_MAX_BOTTOM = 130;

const TONE_SECONDS = 30;
const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

const libraryEntry = (page: Page) =>
  page.getByRole('button', { exact: true, name: 'Library' });

const createButton = (page: Page) => page.getByLabel(/^Create in /);
const nowPlaying = (page: Page) => page.getByLabel(/^Now playing:/);

// After a resize the window reports its new size first and React re-renders the
// layout a frame later, so wait for both before reading the result.
const resizeTo = async (page: Page, size: Size) => {
  await page.setViewportSize(size);
  await waitUntil(async () => {
    const current = page.viewportSize();

    return current?.width === size.width && current.height === size.height;
  }, `the window did not resize to ${size.width} x ${size.height}`);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );
};

/** What the page shows: tabs along the bottom, a rail on the leading edge, or neither. */
const readLayout = async (page: Page, size: Size) => {
  const tab = await libraryEntry(page).boundingBox();
  const create = await createButton(page).boundingBox();
  const player = await nowPlaying(page).boundingBox();

  if (!tab) {
    return { layout: null, detail: 'the Library entry is not on screen' };
  }

  const isAlongBottom = tab.y + tab.height > size.height - BOTTOM_EDGE_GAP;
  const isOnLeadingEdge = tab.x + tab.width <= RAIL_MAX_RIGHT && !isAlongBottom;
  const isFloating = create !== null && create.y > size.height / 2;
  const isInHeader =
    create !== null && create.y + create.height <= HEADER_MAX_BOTTOM;

  const isPlayerBand = player !== null && player.y > size.height / 2;
  const isPlayerPane = player !== null && player.x > size.width / 2;

  if (isAlongBottom && isFloating && isPlayerBand) {
    return {
      layout: 'compact' as const,
      detail: 'bottom tabs, floating + and mini-player band',
    };
  }

  if (isOnLeadingEdge && isInHeader && isPlayerPane) {
    return {
      layout: 'wide-short' as const,
      detail: 'side rail, header + and Now Playing pane',
    };
  }

  return {
    layout: null,
    detail: `tab ${JSON.stringify(tab)}, create ${JSON.stringify(create)}, player ${JSON.stringify(player)}`,
  };
};

const expectLayout = async (page: Page, size: Size, expected: Layout) => {
  const { layout, detail } = await readLayout(page, size);

  if (layout !== expected) {
    throw new Error(
      `${size.width} x ${size.height} should be ${expected} but shows ${layout ?? 'neither'} (${detail})`,
    );
  }
};

const expectLayoutAt = async (page: Page, size: Size, expected: Layout) => {
  await resizeTo(page, size);
  await expectLayout(page, size, expected);
};

const COMPACT_SIZES: [string, Size][] = [
  ['an upright phone', { height: 844, width: 390 }],
  ['a small phone', { height: 640, width: 360 }],
  ['a phone with the keyboard up', { height: 500, width: 390 }],
  ['a tablet upright', { height: 1024, width: 768 }],
  ['a tablet on its side', { height: 768, width: 1024 }],
  ['a desktop window', { height: 800, width: 1280 }],
];

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await page.getByLabel('Play Alto Part').first().click();
    await waitUntil(async () => {
      const state = await readMediaState(page);

      return state !== null && !state.paused;
    }, 'the track did not start playing');

    for (const [name, size] of COMPACT_SIZES) {
      await expectLayoutAt(page, size, 'compact');
      pass(`${name} (${size.width} x ${size.height}) keeps the compact layout`);
    }

    await shot('1-desktop-compact');

    // A phone on its side gets the rail and the header +.
    await expectLayoutAt(page, { height: 390, width: 844 }, 'wide-short');
    await shot('2-phone-wide-short');
    pass('A phone on its side (844 x 390) gets the wide-short layout');

    // The thresholds, entered from compact (a window that is already
    // wide-short has the hysteresis band): 600 wide and under 500 high.
    const UPRIGHT = { height: 844, width: 390 };

    await expectLayoutAt(page, UPRIGHT, 'compact');
    await expectLayoutAt(page, { height: 400, width: 599 }, 'compact');
    await expectLayoutAt(page, { height: 499, width: 600 }, 'wide-short');
    await expectLayoutAt(page, UPRIGHT, 'compact');
    await expectLayoutAt(page, { height: 500, width: 600 }, 'compact');
    pass(
      'The thresholds hold from compact: 599 x 400 compact, 600 x 499 wide-short, 600 x 500 compact',
    );

    // Hysteresis, in height: once wide-short, up to 539 high stays; 540 goes
    // compact, and then 520 stays compact until the height is under 500.
    await expectLayoutAt(page, { height: 480, width: 844 }, 'wide-short');
    await expectLayoutAt(page, { height: 520, width: 844 }, 'wide-short');
    await expectLayoutAt(page, { height: 540, width: 844 }, 'compact');
    await expectLayoutAt(page, { height: 520, width: 844 }, 'compact');
    await expectLayoutAt(page, { height: 480, width: 844 }, 'wide-short');
    pass(
      'Height hysteresis: 520 stays in either layout, 540 leaves, under 500 returns',
    );

    // Hysteresis, in width: once wide-short, down to 560 wide stays.
    await expectLayoutAt(page, { height: 400, width: 580 }, 'wide-short');
    await expectLayoutAt(page, { height: 400, width: 559 }, 'compact');
    await expectLayoutAt(page, { height: 400, width: 580 }, 'compact');
    await expectLayoutAt(page, { height: 400, width: 600 }, 'wide-short');
    pass(
      'Width hysteresis: 580 stays in either layout, 559 leaves, 600 returns',
    );

    // Back upright: the compact layout is whole again.
    await expectLayoutAt(page, { height: 844, width: 390 }, 'compact');
    await waitUntil(
      async () => (await createButton(page).count()) === 1,
      'the floating + did not return',
    );
    pass('Turning upright again restores the bottom tabs and the floating +');
    await createButton(page).waitFor({ timeout: WAIT_MS });
  },
  viewport: { height: 844, width: 390 },
});
