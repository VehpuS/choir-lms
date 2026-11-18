import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// When a track cannot be prepared for the engine (here: the browser reports
// no room), it still plays, on the media element, and the app says once that
// it may sound thin on Bluetooth while it listens. Nothing is left half
// prepared, and the message goes with the next track.
const WAIT_MS = 8000;
const TONE_SECONDS = 30;
const FALLBACK_LINE =
  'May sound thin on Bluetooth · no room to prepare this track';

const names = ['Alto Part', 'Soprano Part'];
const sources = names.map((name) =>
  buildMockSource(name, { durationMs: TONE_SECONDS * 1000 }),
);
const tone = buildToneMedia({ seconds: TONE_SECONDS });

// The browser says the device is full, whatever is really free.
const NO_ROOM = `
(() => {
  if (navigator.storage) {
    navigator.storage.estimate = async () => ({ quota: 1000, usage: 1000 });
  }
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

  return state !== null && !state.paused && state.currentTime > 0;
};

void runScenario({
  drive: {
    media: Object.fromEntries(
      sources.map(({ driveFileId }) => [driveFileId, tone]),
    ),
    state: 'authorized',
  },
  library: { playlists: [], sources },
  mediaProbe: true,
  microphone: true,
  requires: ['chromium'],
  steps: async ({ page, pass, shot }) => {
    await page.addInitScript(NO_ROOM);
    await page.reload();
    await waitForTrack(page, 'Alto Part');
    await turnOnPitchDetection(page);
    await page.getByText('Tracks', { exact: true }).first().click();
    await page.getByText('Play all', { exact: true }).click();

    // The track plays all the same, on the media element.
    await waitUntil(
      () => mediaElementPlaying(page),
      'the track did not play on the media element when it could not be prepared',
    );
    await page
      .getByText(FALLBACK_LINE, { exact: true })
      .first()
      .waitFor({ timeout: WAIT_MS });
    await shot('1-fallback-line');
    pass(
      'A track with no room to prepare plays on the media element and says why',
    );

    // Nothing was prepared, so Offline files has no listening group.
    await page.getByLabel('Open Drive session menu').first().click();
    await page.getByText('Offline files', { exact: true }).click();
    await page
      .getByText('Offline files', { exact: true })
      .first()
      .waitFor({ timeout: WAIT_MS });

    if (
      (await page
        .getByText('Prepared for listening', { exact: true })
        .count()) > 0
    ) {
      throw new Error('audio was prepared although there was no room');
    }

    pass('Nothing is left prepared');
  },
});
