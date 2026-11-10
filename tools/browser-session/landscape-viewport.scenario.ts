import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Issue #46, part 1: opened as a home-screen web app and turned sideways, the
// page must fill the visible window with the app's own background, so no white
// shows at any edge, and it must settle after a rotation without scrolling.
// Chromium has no safe-area insets or iOS standalone mode, so this checks what
// the web entry controls: the page background, the dynamic viewport height,
// `viewport-fit=cover`, and that the root tracks a rotation.
const LANDSCAPE = { height: 390, width: 844 };
const PORTRAIT = { height: 844, width: 390 };
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const SIZE_TOLERANCE_PX = 1;

type PageFacts = {
  appBackground: string;
  bodyBackground: string;
  htmlBackground: string;
  innerHeight: number;
  innerWidth: number;
  rootHeight: number;
  rootWidth: number;
  scrollHeight: number;
  viewportMeta: string;
};

// The app's background is the first painted background below #root.
const readFacts = (page: Page): Promise<PageFacts> =>
  page.evaluate((transparent) => {
    const root = document.getElementById('root') as HTMLElement;
    let node: Element | null = root;
    let appBackground = transparent;

    while (node && appBackground === transparent) {
      appBackground = getComputedStyle(node).backgroundColor;
      node = node.firstElementChild;
    }

    const box = root.getBoundingClientRect();

    return {
      appBackground,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      htmlBackground: getComputedStyle(document.documentElement)
        .backgroundColor,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      rootHeight: box.height,
      rootWidth: box.width,
      scrollHeight: document.documentElement.scrollHeight,
      viewportMeta:
        document
          .querySelector('meta[name="viewport"]')
          ?.getAttribute('content') ?? '',
    };
  }, TRANSPARENT);

const expectFilled = (facts: PageFacts, label: string) => {
  const problems: string[] = [];

  if (facts.appBackground === TRANSPARENT) {
    problems.push('the app paints no background');
  }

  for (const [name, colour] of [
    ['html', facts.htmlBackground],
    ['body', facts.bodyBackground],
  ] as const) {
    if (colour !== facts.appBackground) {
      problems.push(
        `${name} background is ${colour}, not the app's ${facts.appBackground}`,
      );
    }
  }

  if (
    Math.abs(facts.rootHeight - facts.innerHeight) > SIZE_TOLERANCE_PX ||
    Math.abs(facts.rootWidth - facts.innerWidth) > SIZE_TOLERANCE_PX
  ) {
    problems.push(
      `#root is ${facts.rootWidth}x${facts.rootHeight}, the window ${facts.innerWidth}x${facts.innerHeight}`,
    );
  }

  if (facts.scrollHeight > facts.innerHeight + SIZE_TOLERANCE_PX) {
    problems.push(
      `the page scrolls (${facts.scrollHeight} > ${facts.innerHeight})`,
    );
  }

  if (!facts.viewportMeta.includes('viewport-fit=cover')) {
    problems.push(
      `viewport meta lacks viewport-fit=cover: ${facts.viewportMeta}`,
    );
  }

  if (problems.length > 0) {
    throw new Error(`${label}: ${problems.join('; ')}`);
  }
};

const alto = buildMockSource('Alto Part');

void runScenario({
  library: { playlists: [], sources: [alto] },
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await page.setViewportSize(LANDSCAPE);
    await waitUntil(
      async () => (await readFacts(page)).innerWidth === LANDSCAPE.width,
      'the window did not resize to landscape',
    );
    await shot('1-landscape');
    expectFilled(await readFacts(page), 'landscape');
    pass('The page fills a landscape window with the app background');

    // Rotate there and back: the root follows each size without a scroll.
    await page.setViewportSize(PORTRAIT);
    await waitUntil(
      async () => (await readFacts(page)).innerWidth === PORTRAIT.width,
      'the window did not resize to portrait',
    );
    expectFilled(await readFacts(page), 'portrait after rotating');
    await page.setViewportSize(LANDSCAPE);
    await waitUntil(
      async () => (await readFacts(page)).innerWidth === LANDSCAPE.width,
      'the window did not resize back to landscape',
    );
    await shot('2-landscape-again');
    expectFilled(await readFacts(page), 'landscape after rotating back');
    pass('The page follows a rotation to portrait and back');
  },
  viewport: PORTRAIT,
});
