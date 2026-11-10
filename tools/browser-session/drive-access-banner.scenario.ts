import assert from 'node:assert/strict';

import { buildTrackRenameMockLibrary } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { runScenario } from './scenario-runner';

// Live check for issue #40 (simplified Drive access UI) with an EXPIRED mock
// Drive session: every saved track is unavailable for a session reason, so the
// app must show ONE single-line banner with Reconnect and keep the rows quiet. Usage,
// after `nx run mobile-rehearsal-player:build`:
//   npx tsx tools/browser-session/drive-access-banner.scenario.ts <outDir>
const WAIT_MS = 5000;
const BANNER_TITLE = 'Drive disconnected';
const SIGN_IN_HOST = 'accounts.google.com';
// A one-line banner is about 40-50px; two wrapped lines would be well above.
const MAX_BANNER_HEIGHT_PX = 60;
const OLD_ROW_MESSAGES = [
  'Reconnect Google Drive to restore this saved rehearsal track.',
  'Connect Google Drive to verify or play this saved rehearsal track.',
];
const OLD_CARD_TITLE = 'Saved tracks need Drive access';

void runScenario({
  drive: { state: 'expired' },
  library: buildTrackRenameMockLibrary(),
  steps: async ({ page, pass, session, shot }) => {
    await page.getByLabel('Alto Part options').first().waitFor();
    await page.getByText('Tracks', { exact: true }).first().click();
    await page.getByLabel('Soprano Part options').first().waitFor();

    // 1. A disconnected session shows exactly one banner, not one per track.
    const banner = page.getByText(BANNER_TITLE, { exact: true });

    await banner.first().waitFor({ timeout: WAIT_MS });
    assert.equal(await banner.count(), 1);
    await shot('1-session-banner');
    pass('One banner for the whole disconnected session');

    // 2. The banner stays on one line at phone width.
    const box = await banner.first().boundingBox();

    assert.ok(box && box.height <= MAX_BANNER_HEIGHT_PX, 'banner wraps');
    pass('Banner title fits one line at 390pt');

    // 3. Rows no longer repeat the sentence, and the paragraph card is gone.
    for (const message of OLD_ROW_MESSAGES) {
      assert.equal(await page.getByText(message).count(), 0, message);
    }
    assert.equal(await page.getByText(OLD_CARD_TITLE).count(), 0);
    pass('No per-row message and no paragraph card');

    // 4. Nothing overflows horizontally.
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );

    assert.ok(overflow <= 0, `page overflows by ${overflow}px`);
    pass('No horizontal overflow');

    // 5. Reconnect opens Google sign-in (the mock serves a stub page).
    const popup = page.waitForEvent('popup', { timeout: WAIT_MS });

    await page.getByLabel('Reconnect').first().click();
    assert.equal(new URL((await popup).url()).hostname, SIGN_IN_HOST);
    await shot('2-reconnect-sign-in');
    pass('Reconnect starts Google sign-in');
  },
});
