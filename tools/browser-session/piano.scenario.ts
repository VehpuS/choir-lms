import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import {
  C4_HZ,
  WAIT_MS,
  expectTone,
  holdKey,
  keyColor,
  openPiano,
} from './piano-helpers';
import { waitForTrack } from './page-helpers';
import { runScenario } from './scenario-runner';

// The piano in a new session that is not signed in to Google: its sounds ship
// with the app, so it needs neither Drive nor a network. A held key lights up,
// and the page's audio output carries its pitch (C4 is 261.6 Hz).
const alto = buildMockSource('Alto Part');

void runScenario({
  audioTap: true,
  library: { playlists: [], sources: [alto] },
  steps: async ({ page, pass, session, shot }) => {
    await waitForTrack(page, 'Alto Part').catch(() => undefined);
    await page
      .getByText('Connect Google Drive', { exact: true })
      .first()
      .waitFor({ timeout: WAIT_MS });
    pass('The session is new and not signed in');

    await openPiano(page);
    const restingColor = await keyColor(page, 'C4');

    await holdKey(page, session, 'C4', async () => {
      if ((await keyColor(page, 'C4')) === restingColor) {
        throw new Error('the held key is not shown pressed');
      }
      await shot('1-key-held');
    });
    await expectTone(session, C4_HZ, 'pressing C4 without signing in');
    pass('Pressing C4 without signing in lights the key and plays a C4');

    if ((await keyColor(page, 'C4')) !== restingColor) {
      throw new Error('the key stays pressed after release');
    }
    pass('Letting go returns the key to rest');
  },
});
