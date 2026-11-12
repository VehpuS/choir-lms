import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import {
  C4_HZ,
  expectTone,
  holdKey,
  keyColor,
  openPiano,
} from './piano-helpers';
import { runScenario } from './scenario-runner';

// The piano while a track plays: a key plays its note without stopping or
// pausing the track, and the track keeps moving on.
const TONE_SECONDS = 40;
const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

void runScenario({
  // Holds a piano key while audio plays, which intermittently hangs Playwright's
  // WebKit (the WPE build) until the scenario time limit; the same code passes
  // other runs there. Not reproduced outside CI; confirm on real Safari by hand
  // (tasks.md follow-up F.3).
  requires: ['chromium', 'firefox'],
  audioTap: true,
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  steps: async ({ page, pass, session, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await page.getByLabel('Play Alto Part').first().click();
    await waitUntil(async () => {
      const state = await readMediaState(page);

      return state !== null && !state.paused && state.currentTime > 0;
    }, 'the track did not start playing');
    await openPiano(page);
    const restingColor = await keyColor(page, 'C4');
    const before = await readMediaState(page);

    await holdKey(page, session, 'C4', async () => {
      if ((await keyColor(page, 'C4')) === restingColor) {
        throw new Error('the held key is not shown pressed');
      }
      await shot('1-key-held-during-playback');
    });
    await expectTone(session, C4_HZ, 'pressing C4 during playback');
    pass('A key plays its note while a track is playing');

    // The track went on: still playing, and later than it was.
    await waitUntil(async () => {
      const after = await readMediaState(page);

      return (
        after !== null &&
        !after.paused &&
        before !== null &&
        after.currentTime > before.currentTime
      );
    }, 'the track stopped or paused when a piano key was played');
    pass('The track keeps playing, and moving on, under the piano');
  },
});
