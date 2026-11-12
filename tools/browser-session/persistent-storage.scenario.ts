import assert from 'node:assert/strict';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { buildToneMedia } from './mock-media';
import {
  openTrackMenu,
  visibleText,
  waitForTrack,
  waitUntil,
} from './page-helpers';
import { runScenario } from './scenario-runner';

// web-platform-modernization 4.1 (F8): keeping a file offline asks the browser
// to make storage persistent, once; a refusal is not an error and the Offline
// files screen says the browser may clear the files. The browser is given a
// storage manager that counts the requests and answers "no".
const WAIT_MS = 5000;
const TONE_SECONDS = 10;
const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });
const tenor = buildMockSource('Tenor Part', {
  durationMs: TONE_SECONDS * 1000,
});
const media = buildToneMedia({ seconds: TONE_SECONDS });

// Plain script text: it runs in the page, where the test tooling's helpers do not exist.
const STORAGE_STUB = `
  (() => {
    window.__persistCalls = 0;
    const answer = { persist: async () => { window.__persistCalls += 1; return false; }, persisted: async () => false };
    Object.defineProperty(navigator, 'storage', { configurable: true, get: () => answer });
  })();
`;

void runScenario({
  drive: {
    media: { [alto.driveFileId]: media, [tenor.driveFileId]: media },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto, tenor] },
  steps: async ({ page, pass }) => {
    await page.addInitScript(STORAGE_STUB);
    await page.reload();
    await waitForTrack(page, 'Alto Part');

    const persistCalls = () => page.evaluate<number>('window.__persistCalls');

    assert.equal(await persistCalls(), 0, 'asked before anything was kept');
    pass('Nothing is requested before a file is kept offline');

    await openTrackMenu(page, 'Alto Part');
    await page.getByText('Keep offline', { exact: true }).click();
    await page.getByLabel('Kept offline').first().waitFor({ timeout: WAIT_MS });
    assert.equal(await persistCalls(), 1, 'keeping a file did not ask once');
    pass('Keeping a file offline asks for persistent storage once');

    await openTrackMenu(page, 'Tenor Part');
    await page.getByText('Keep offline', { exact: true }).click();
    await waitUntil(
      async () => (await page.getByLabel('Kept offline').count()) >= 2,
      'the second file was not kept',
    );
    assert.equal(await persistCalls(), 1, 'a second keep asked again');
    pass('A second kept file does not ask again');

    await page
      .getByLabel('Open Drive session menu')
      .filter({ visible: true })
      .click();
    await page.getByText('Offline files', { exact: true }).click();
    await visibleText(
      page,
      'This browser may clear offline files when it is short on space.',
    ).waitFor({
      timeout: WAIT_MS,
    });
    pass('A refusal is shown on the Offline files screen');
  },
});
