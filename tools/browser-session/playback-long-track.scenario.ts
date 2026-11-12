import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// A ten-minute track: the player reports its real length, seeking late in the
// track lands there (the progress label and the player agree), and playback
// carries on from that point. A low sample rate keeps the generated file small
// (about 10 MB); it is served with Range support like any other media.
const TRACK_SECONDS = 600;
const SAMPLE_RATE = 8000;
const SEEK_FRACTION = 0.95;
const SEEK_TOLERANCE_S = 15;
const WAIT_MS = 15_000;

const source = buildMockSource('Long Track', {
  durationMs: TRACK_SECONDS * 1000,
});

void runScenario({
  // Intermittently fails in Playwright's WebKit (the WPE build) with a media
  // NotSupportedError loading the ten-minute track; not seen in Chromium or
  // Firefox. Confirm on real Safari by hand (tasks.md follow-up F.3).
  requires: ['chromium', 'firefox'],
  drive: {
    media: {
      [source.driveFileId]: buildToneMedia({
        sampleRate: SAMPLE_RATE,
        seconds: TRACK_SECONDS,
      }),
    },
    state: 'authorized',
  },
  library: { playlists: [], sources: [source] },
  mediaProbe: true,
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Long Track');
    await page.getByLabel('Play Long Track').first().click();
    await page
      .getByText(/Playing · [\d:]+ of 10:00/)
      .first()
      .waitFor({ timeout: WAIT_MS });
    pass('The player reports the real length: 10:00');

    // Seek by clicking late on the waveform.
    await page.getByLabel(/^Now playing:/).click();
    const waveform = page.getByLabel('Playback waveform');

    await waveform.waitFor({ timeout: WAIT_MS });

    const box = await waveform.boundingBox();

    if (!box) {
      throw new Error('the playback waveform has no size');
    }

    await page.mouse.click(
      box.x + box.width * SEEK_FRACTION,
      box.y + box.height / 2,
    );

    const target = TRACK_SECONDS * SEEK_FRACTION;

    await waitUntil(async () => {
      const state = await readMediaState(page);

      return (
        state !== null &&
        Math.abs(state.currentTime - target) < SEEK_TOLERANCE_S
      );
    }, 'seeking near the end did not land near the end');
    await page
      .getByText(/^9:[2-5]\d$/)
      .first()
      .waitFor({ timeout: WAIT_MS });
    await shot('1-near-the-end');
    pass(
      'Seeking to 95% lands near 9:30, in the player and in the progress label',
    );

    // It keeps playing from there.
    const landed = (await readMediaState(page))?.currentTime ?? 0;

    // Wait for the position to move on rather than for a fixed time: a slow
    // runner (Firefox in CI) can take longer than two seconds to buffer.
    await waitUntil(async () => {
      const later = await readMediaState(page);

      return Boolean(later && !later.paused && later.currentTime >= landed + 1);
    }, 'playback did not carry on after the seek');

    pass('Playback carries on from the seek position');
  },
});
