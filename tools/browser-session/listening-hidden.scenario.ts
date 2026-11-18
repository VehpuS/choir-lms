import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readAppIsPlaying, readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// The Web Audio engine does not play in the background on a phone; the media
// element does. So when the app is hidden while a track plays on the engine
// (pitch detection on), the track is handed back to the media element where
// it is and keeps playing, and the lock-screen state says so. Back in front,
// listening resumes and the track returns to the engine.
const WAIT_MS = 8000;
const TONE_SECONDS = 60;
const SWITCH_TOLERANCE_S = 3;

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

// Plain script text: it runs in the page. Hides and shows the page the way a
// browser reports it, since the test browser's page is always in front.
const VISIBILITY_STUB = `
  (() => {
    window.__hidden = false;
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (window.__hidden ? 'hidden' : 'visible') });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__hidden });
    window.__setHidden = (hidden) => {
      window.__hidden = hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    };
  })();
`;

const turnOnPitchDetection = async (page: Page) => {
  await page.getByLabel('Practice tools', { exact: true }).click();
  await page.getByLabel('Pitch detection, off').click();
  await page.getByLabel('Pitch detection, on').waitFor({ timeout: WAIT_MS });
  await page
    .getByLabel('Close practice tools')
    .first()
    .click({ timeout: 2000 })
    .catch(() => undefined);
};

const mediaElementPlaying = async (page: Page) => {
  const state = await readMediaState(page);

  return state !== null && !state.paused;
};

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  microphone: true,
  requires: ['chromium'],
  steps: async ({ page, pass }) => {
    await page.addInitScript(VISIBILITY_STUB);
    await page.reload();
    await waitForTrack(page, 'Alto Part');
    await turnOnPitchDetection(page);
    await page.getByText('Tracks', { exact: true }).first().click();
    await page.getByText('Play all', { exact: true }).click();
    await waitUntil(
      async () =>
        (await readAppIsPlaying(page)) && !(await mediaElementPlaying(page)),
      'the track did not start on the engine',
    );
    // Let it get somewhere, so "where it is" is not the start.
    await page.waitForTimeout(3000);
    pass('With pitch detection on the track plays on the engine');

    // Hidden: the media element takes over where the engine was.
    await page.evaluate('window.__setHidden(true)');
    await waitUntil(
      () => mediaElementPlaying(page),
      'the media element did not take the track when the app was hidden',
    );

    const takenOverAt = (await readMediaState(page))?.currentTime ?? -1;

    if (takenOverAt < 2 || takenOverAt > 3 + SWITCH_TOLERANCE_S + 3) {
      throw new Error(
        `hidden: the media element took over at ${takenOverAt} s, not near where the engine was`,
      );
    }

    // The lock screen state follows the player a moment after it changes.
    await waitUntil(
      () => readAppIsPlaying(page),
      'hidden: the lock screen is not told the track plays',
    );

    await waitUntil(
      async () =>
        ((await readMediaState(page))?.currentTime ?? 0) > takenOverAt + 1,
      'the track did not keep playing while hidden',
    );
    pass(
      'Hidden: the track moves to the media element in place and keeps playing',
    );

    // In front again: listening resumes and the engine takes the track back.
    const beforeShown = (await readMediaState(page))?.currentTime ?? 0;

    await page.evaluate('window.__setHidden(false)');
    await waitUntil(
      async () =>
        (await readAppIsPlaying(page)) && !(await mediaElementPlaying(page)),
      'the track did not return to the engine when the app came back',
    );
    await page.getByLabel(/^Now playing:/).click();
    await page.getByLabel('Forward 15 seconds').waitFor({ timeout: WAIT_MS });

    const remaining = await page
      .getByText(/^[-−]\d+:\d\d$/)
      .last()
      .innerText();
    const [minutes, seconds] = remaining.slice(1).split(':').map(Number);
    const position = TONE_SECONDS - (minutes * 60 + seconds);

    if (position < beforeShown - 1 || position > beforeShown + 8) {
      throw new Error(
        `shown again: at ${position} s, expected about ${beforeShown} s`,
      );
    }

    pass('Back in front, the track returns to the engine where it was');
  },
});
