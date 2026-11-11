import type { Locator } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { buildToneMedia } from './mock-media';
import { openTrackMenu, waitForTrack, waitUntil } from './page-helpers';
import { WAIT_MS } from './piano-helpers';
import { settledBox } from './safe-area-helpers';
import { runScenario } from './scenario-runner';

// Issue #46, follow-up F.3: in the wide-short layout the loop editor is two
// columns inside its sheet: the waveform with its A and B handles wide on the
// left, and the steppers, the preview transport, the name field and Save on the
// right, so nothing needs a scroll. Upright keeps its single column.
const LANDSCAPE = { height: 390, width: 844 };
const PORTRAIT = { height: 844, width: 390 };
const TONE_SECONDS = 20;
const WAVEFORM_MIN_WIDTH = 440;
const TOLERANCE = 3;

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
    await waitUntil(async () => {
      const box = await page
        .getByRole('button', { exact: true, name: 'Library' })
        .boundingBox();

      return box !== null && box.x < 120;
    }, 'the side rail did not appear');
    await openTrackMenu(page, 'Alto Part');
    await page.getByText('Make loop', { exact: true }).click();
    await page
      .getByText('NEW LOOP', { exact: false })
      .waitFor({ timeout: WAIT_MS });
    await page.getByText('0:20.0').first().waitFor({ timeout: WAIT_MS });

    const start = await boxOf(page.getByLabel('Loop start handle'), 'handle A');
    const end = await boxOf(page.getByLabel('Loop end handle'), 'handle B');
    const name = page.getByLabel('Loop name');
    const save = page.getByLabel('Save loop');
    const stepper = page.getByLabel('Move loop start later');

    await shot('1-landscape');

    if (end.x - start.x < WAVEFORM_MIN_WIDTH) {
      throw new Error(
        `the waveform is only ${Math.round(end.x - start.x)} points wide`,
      );
    }

    for (const [label, target] of [
      ['the Loop name field', name],
      ['the Save loop button', save],
      ['the start stepper', stepper],
      ['the Set start here button', page.getByLabel('Set start here')],
      ['the Set end here button', page.getByLabel('Set end here')],
      ['the preview button', page.getByLabel(/preview/i).first()],
    ] as const) {
      const box = await boxOf(target, label);

      if (box.y + box.height > LANDSCAPE.height + TOLERANCE || box.y < 0) {
        throw new Error(
          `${label} is outside the window without a scroll (y ${Math.round(box.y)})`,
        );
      }

      if (!(await isReachable(target))) {
        throw new Error(`${label} is covered`);
      }

      if (
        label !== 'the Set start here button' &&
        label !== 'the Set end here button' &&
        label !== 'the preview button' &&
        box.x < end.x - 120
      ) {
        throw new Error(`${label} is not in the right column`);
      }
    }

    pass(
      'In landscape the waveform is wide and every control fits without scrolling',
    );

    // Upright: one column, the name field below the waveform.
    await page.getByLabel('Close loop editor').click();
    await page.setViewportSize(PORTRAIT);
    await waitUntil(async () => {
      const box = await page
        .getByRole('button', { exact: true, name: 'Library' })
        .boundingBox();

      return box !== null && box.y > PORTRAIT.height / 2;
    }, 'the upright layout did not return');
    await openTrackMenu(page, 'Alto Part');
    await page.getByText('Make loop', { exact: true }).click();
    await page
      .getByText('NEW LOOP', { exact: false })
      .waitFor({ timeout: WAIT_MS });
    const upStart = await boxOf(
      page.getByLabel('Loop start handle'),
      'handle A',
    );
    const upName = await boxOf(page.getByLabel('Loop name'), 'the name field');

    if (upName.y < upStart.y + upStart.height - TOLERANCE) {
      throw new Error('upright lost its single column');
    }

    await shot('2-upright');
    pass('Upright keeps the single column');
  },
  viewport: LANDSCAPE,
});
