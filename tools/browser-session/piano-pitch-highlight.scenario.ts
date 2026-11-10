import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack, waitUntil } from './page-helpers';
import { WAIT_MS } from './piano-helpers';
import { runScenario } from './scenario-runner';

// Singing on the piano: with Pitch detection on, the key of the sung note is
// lit (a lighter key with an accent bar; a black key changes colour), and when
// that key is scrolled out of view an arrow with the note's name points toward
// it. The stem is the microphone and sings E4, C♯4, C4, so the keys are checked
// in view, then after scrolling the keyboard far to each side.
const SEQUENCE_TIMEOUT_MS = 25_000;
const SHORT_WAIT_MS = 1000;
const SCROLL_STEPS = 12;
const SCROLL_STEP_PX = 400;
// Lit keys are named by where they sit against the C4 key: whole white keys to
// the right (W0 is C4, W2 is E4) and black keys between whites (B0 is C♯4).
const EXPECTED_LIT = ['W2', 'B0', 'W0'];
const EXPECTED_EDGE_NOTES = ['E4', 'C#4', 'C4'];
const EDGE_LABEL = /^Sung note (\S+) is off screen to the (left|right)$/;
const KEYBOARD = '[data-testid="piano-keyboard"]';

const alto = buildMockSource('Alto Part');

/** The keys lit now, named by their place against C4 (see `EXPECTED_LIT`). */
const readLitKeys = (page: Page): Promise<string[]> =>
  page.evaluate(`(() => {
    const strip = document.querySelector('${KEYBOARD}')?.firstElementChild;
    if (!strip) return [];
    const keys = [...strip.children].map((element) => ({
      background: getComputedStyle(element).backgroundColor,
      box: element.getBoundingClientRect(),
      label: element.textContent,
    }));
    const c4 = keys.find((key) => key.label === 'C4');
    if (!c4) return [];
    const whiteHeight = c4.box.height;
    // Within each kind, the resting colour is the common one; a key that is
    // not (and is on screen) is lit.
    const restingColors = {};
    keys.forEach((key) => {
      const kind = key.box.height === whiteHeight ? 'w' : 'b';
      restingColors[kind + key.background] = (restingColors[kind + key.background] || 0) + 1;
    });
    return keys
      .filter((key) => {
        const kind = key.box.height === whiteHeight ? 'w' : 'b';
        return restingColors[kind + key.background] < 4 && key.box.x > -key.box.width && key.box.x < window.innerWidth;
      })
      .map((key) => {
        const kind = key.box.height === whiteHeight ? 'W' : 'B';
        const steps = (key.box.x - c4.box.x) / c4.box.width;
        return kind + (kind === 'W' ? Math.round(steps) : Math.floor(steps));
      });
  })()`);

/** The note names the off-screen arrows have pointed at, in order, with sides. */
const readEdge = (page: Page): Promise<{ note: string; side: string } | null> =>
  page.evaluate(
    ({ pattern }) => {
      const label = Array.from(
        document.querySelectorAll('[aria-label^="Sung note"]'),
      )
        .map((element) => element.getAttribute('aria-label') ?? '')
        .find((text) => new RegExp(pattern).test(text));
      const match = label ? new RegExp(pattern).exec(label) : null;

      return match
        ? { note: match[1].replace('♯', '#'), side: match[2] }
        : null;
    },
    { pattern: EDGE_LABEL.source },
  );

/** Waits until a sampled sequence holds `expected` in order. */
const waitForSequence = async (
  sample: () => Promise<string | null>,
  expected: readonly string[],
  what: string,
  side?: string,
) => {
  const seen: string[] = [];

  await waitUntil(
    async () => {
      const value = await sample();

      if (value !== null && seen[seen.length - 1] !== value) {
        seen.push(value);
      }
      let next = 0;

      for (const item of seen) {
        if (item === expected[next]) {
          next += 1;
        }
      }

      return next === expected.length;
    },
    `${what}: expected ${expected.join(', ')} in order${side ? ` (${side})` : ''}, saw ${seen.join(', ') || 'nothing'}`,
    SEQUENCE_TIMEOUT_MS,
  );
};

/** Scrolls the keyboard with the wheel until it is at one end. */
const scrollKeyboard = async (page: Page, direction: 1 | -1) => {
  const box = await page.locator(KEYBOARD).boundingBox();

  if (!box) {
    throw new Error('the keyboard is not on screen');
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let step = 0; step < SCROLL_STEPS; step += 1) {
    await page.mouse.wheel(direction * SCROLL_STEP_PX, 0);
  }
};

void runScenario({
  library: { playlists: [], sources: [alto] },
  microphone: true,
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part').catch(() => undefined);
    await page.getByLabel('Practice tools', { exact: true }).click();
    await page.getByLabel('Piano, off').click();
    await page.getByLabel('Pitch detection, off').click();
    await page.getByLabel('Pitch detection, on').waitFor({ timeout: WAIT_MS });
    // The headphones note shows only sometimes; do not wait long for it.
    await page
      .getByText('Got it', { exact: true })
      .click({ timeout: SHORT_WAIT_MS })
      .catch(() => undefined);
    await page.getByLabel('Close practice tools').first().click();
    await page.locator(KEYBOARD).waitFor({ timeout: WAIT_MS });
    // In view: the sung keys light up, in turn.
    await waitForSequence(
      async () => (await readLitKeys(page)).at(0) ?? null,
      EXPECTED_LIT,
      'keys lit in view',
    );
    await shot('1-keys-lit-in-view');
    pass('In view, the keys of E4, C♯4 and C4 light up as they are sung');

    // Out of view, to the left: C4 is far to the right of A0.
    await scrollKeyboard(page, -1);
    await waitForSequence(
      async () => {
        const edge = await readEdge(page);

        return edge?.side === 'right' ? edge.note : null;
      },
      EXPECTED_EDGE_NOTES,
      'arrows to the right',
    );
    await shot('2-arrow-right');
    pass(
      'Scrolled away, an arrow to the right names E4, C♯4 and C4 as they are sung',
    );

    // Out of view, to the right: the other direction.
    await scrollKeyboard(page, 1);
    await waitForSequence(
      async () => {
        const edge = await readEdge(page);

        return edge?.side === 'left' ? edge.note : null;
      },
      EXPECTED_EDGE_NOTES,
      'arrows to the left',
    );
    await shot('3-arrow-left');
    pass('Scrolled the other way, an arrow to the left names them instead');
  },
});
