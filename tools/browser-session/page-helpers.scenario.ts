import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildDefaultMockLibrary } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import {
  chooseMenuItem,
  expectToast,
  openTab,
  openTrackMenu,
  waitForTrack,
} from './page-helpers';
import { runScenario } from './scenario-runner';

// Proves the shared page helpers and the failure evidence: tab switching, the
// track menu, toasts, the console-error check, and the trace and console log a
// failing scenario leaves behind.
void runScenario({
  library: buildDefaultMockLibrary(),
  steps: async ({ page, pass, session }) => {
    await waitForTrack(page, 'Alto Part');
    pass('the library lists its tracks');

    await openTab(page, 'Add');
    await page.getByText('My Drive').first().waitFor();
    pass('openTab opens Add');

    await openTab(page, 'Library');
    await waitForTrack(page, 'Alto Part');
    pass('openTab returns to Library');

    await openTrackMenu(page, 'Alto Part');
    await chooseMenuItem(page, 'Add to playlist');
    await chooseMenuItem(page, 'Sunday Set');
    await expectToast(page, 'Alto Part was added to Sunday Set.');
    pass('the track menu, menu items and toast helpers work');

    session.expectNoConsoleErrors();
    pass('a normal flow logs no unexpected console errors');

    await page.evaluate(() => console.error('boom from the page'));

    let reported = false;

    try {
      session.expectNoConsoleErrors();
    } catch (error) {
      reported = (error as Error).message.includes('boom from the page');
    }

    if (!reported) {
      throw new Error('expectNoConsoleErrors missed a console error');
    }

    session.expectNoConsoleErrors([/boom from the page/]);
    pass('console errors are reported unless ignored');

    // Last step: saving the evidence ends the trace.
    const evidenceDir = mkdtempSync(join(tmpdir(), 'evidence-'));

    await session.saveFailureEvidence(evidenceDir);

    const trace = join(evidenceDir, 'failure-trace.zip');
    const consoleText = readFileSync(
      join(evidenceDir, 'failure-console.txt'),
      'utf8',
    );

    if (
      !existsSync(trace) ||
      statSync(trace).size === 0 ||
      !consoleText.includes('boom from the page')
    ) {
      throw new Error('failure evidence was not written');
    }

    pass('failure evidence holds a trace and the console log');
  },
});
