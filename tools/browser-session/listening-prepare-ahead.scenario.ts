import type { Page } from 'playwright';

import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readAppIsPlaying } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// While a queue plays with pitch detection on, the next track is prepared
// during the current one, so it starts without a preparing wait. Seen from
// outside: Offline files lists the next track under `Prepared for listening`
// while the first is still the one playing.
const WAIT_MS = 10_000;
const TONE_SECONDS = 60;
const PREPARED_TRACKS = /prepared for listening of (\d+) tracks?/;

const names = ['Alto Part', 'Soprano Part', 'Tenor Part'];
const sources = names.map((name) =>
  buildMockSource(name, { durationMs: TONE_SECONDS * 1000 }),
);
const tone = buildToneMedia({ seconds: TONE_SECONDS });

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

void runScenario({
  drive: {
    media: Object.fromEntries(
      sources.map(({ driveFileId }) => [driveFileId, tone]),
    ),
    state: 'authorized',
  },
  library: { playlists: [], sources },
  microphone: true,
  requires: ['chromium'],
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await turnOnPitchDetection(page);
    await page.getByText('Tracks', { exact: true }).first().click();
    await page.getByText('Play all', { exact: true }).click();
    await page
      .getByText('Playing · Current queue · 1 of 3')
      .first()
      .waitFor({ timeout: WAIT_MS });
    await waitUntil(
      () => readAppIsPlaying(page),
      'the queue did not start playing',
    );

    await page.getByLabel('Open Drive session menu').first().click();
    await page.getByText('Offline files', { exact: true }).click();
    await page
      .getByText('Prepared for listening', { exact: true })
      .waitFor({ timeout: WAIT_MS });

    // The `Clear all` confirmation says how many tracks have prepared audio.
    // The view reads the store when it opens, so reopen it until the next
    // track is in; the confirmation is cancelled each time.
    const preparedCount = async () => {
      await page.getByText('Clear all', { exact: true }).click();

      const message = await page
        .getByText(PREPARED_TRACKS, { exact: false })
        .first()
        .innerText();

      await page.getByText('Cancel', { exact: true }).last().click();

      return Number(PREPARED_TRACKS.exec(message)?.[1] ?? 0);
    };
    let count = await preparedCount();

    await waitUntil(async () => {
      if (count >= 2) {
        return true;
      }

      await page.getByLabel('Open Drive session menu').first().click();
      await page.getByText('Offline files', { exact: true }).click();
      count = await preparedCount();

      return false;
    }, 'the next track of the queue was not prepared while the first played');

    if (count !== 2) {
      throw new Error(
        `${count} tracks were prepared, not the playing one and the next`,
      );
    }

    await page
      .getByText('Playing · Current queue · 1 of 3')
      .first()
      .waitFor({ timeout: WAIT_MS });
    await shot('1-next-prepared');
    pass(
      'The next track is prepared while the first still plays, and only the next',
    );
  },
});
