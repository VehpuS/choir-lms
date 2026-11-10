import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { runScenario } from './scenario-runner';

// Live check for issue #40 with an AUTHORISED mock Drive session: the session
// is fine, so there is no banner, and only the files with a problem show a
// short chip (not the full sentence). Usage, after
// `nx run mobile-rehearsal-player:build-browser-test`:
//   npx tsx tools/browser-session/drive-access-chips.scenario.ts <outDir>
const WAIT_MS = 5000;
const NEEDS_ACCESS_MESSAGE =
  'This file has not been shared with you yet, so its Drive location cannot be opened.';
const MISSING_MESSAGE =
  'This file could not be found in Google Drive, so its current location cannot be opened.';
const BANNER_TITLES = ['Drive disconnected', 'Connect Google Drive'];
const MAX_CHIP_HEIGHT_PX = 28;

const fine = buildMockSource('Alto Part', {
  availability: { status: 'available' },
});
const needsAccess = buildMockSource('Bass Part', {
  availability: {
    message: NEEDS_ACCESS_MESSAGE,
    reason: 'needs-access',
    status: 'unavailable',
  },
});
const missing = buildMockSource('Tenor Part', {
  availability: {
    message: MISSING_MESSAGE,
    reason: 'missing',
    status: 'unavailable',
  },
});

void runScenario({
  drive: { state: 'authorized' },
  library: { playlists: [], sources: [fine, needsAccess, missing] },
  steps: async ({ page, pass, shot }) => {
    await page.getByLabel('Alto Part options').first().waitFor();
    await page.getByText('Tracks', { exact: true }).first().click();
    await page.getByLabel('Bass Part options').first().waitFor();

    // 1. A connected session shows no banner.
    for (const title of BANNER_TITLES) {
      assert.equal(await page.getByText(title, { exact: true }).count(), 0);
    }
    pass('No banner while connected');

    // 2. Each problem file shows its short chip, on one line.
    const chips = ['Needs access', 'Not found'];

    for (const label of chips) {
      const chip = page.getByText(label, { exact: true });

      await chip.first().waitFor({ timeout: WAIT_MS });
      assert.equal(await chip.count(), 1, label);
      const box = await chip.first().boundingBox();

      assert.ok(box && box.height <= MAX_CHIP_HEIGHT_PX, `${label} wraps`);
    }
    await shot('1-access-chips');
    pass('Short one-line chips on the files with a problem');

    // 3. The full sentences are not repeated on the rows.
    for (const message of [NEEDS_ACCESS_MESSAGE, MISSING_MESSAGE]) {
      assert.equal(await page.getByText(message).count(), 0, message);
    }
    pass('No sentence on the rows');
  },
});
