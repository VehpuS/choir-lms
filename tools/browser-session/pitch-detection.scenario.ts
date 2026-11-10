import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { CHOIR_STEM_NOTES } from '../../packages/mobile-rehearsal-player/src/test-support/fixtures/choir-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Pitch detection: with the choir stem as the microphone, the app's pitch
// monitor shows E4, then C♯4, then C4 as the stem sings them (and how far each
// reading is from the note). The microphone is Chromium's fake device looping
// the stem; the readings come from the app's own pitch pipeline.
const WAIT_MS = 5000;
const LISTEN_MS = 9000;
const SAMPLE_EVERY_MS = 60;
const MAX_CENTS_OFF = 50;
// "C4, 17 cents flat" / "E4, in tune"
const READING_PATTERN =
  /^([A-G][♯♭]?\d), (?:(\d+) cents (flat|sharp)|in tune)$/;

const alto = buildMockSource('Alto Part', { durationMs: 30_000 });

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: 30 }) },
    state: 'authorized',
  },
  library: { playlists: [], sources: [alto] },
  mediaProbe: true,
  microphone: true,
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part');
    await page.getByLabel('Play Alto Part').first().click();
    await waitUntil(async () => {
      const state = await readMediaState(page);

      return state !== null && !state.paused;
    }, 'the track did not start playing');
    await page.getByLabel(/^Now playing:/).click();
    // Two buttons share the name: the tab, and the toolbox in the playback sheet (last).
    await page.getByLabel('Practice tools').last().click();
    await page.getByLabel('Pitch detection, off').click();
    await page.getByLabel('Pitch detection, on').waitFor({ timeout: WAIT_MS });
    await page
      .getByText('Listening', { exact: false })
      .first()
      .waitFor({ timeout: WAIT_MS });
    pass('Turning Pitch detection on starts listening to the microphone');

    // Sample the monitor's label while the stem loops past.
    const heard: string[] = [];
    const centsOff: number[] = [];
    const deadline = Date.now() + LISTEN_MS;

    while (Date.now() < deadline) {
      const labels = (await page.evaluate(
        `[...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label'))`,
      )) as string[];
      const reading = labels
        .map((label) => READING_PATTERN.exec(label))
        .find((match) => match !== null);

      if (reading && heard[heard.length - 1] !== reading[1]) {
        heard.push(reading[1]);
      }

      if (reading?.[2]) {
        centsOff.push(Number(reading[2]));
      }

      await page.waitForTimeout(SAMPLE_EVERY_MS);
    }

    await shot('1-pitch-monitor');
    console.log(`  the monitor showed: ${heard.join(' ')}`);

    let next = 0;

    for (const note of heard) {
      if (note === CHOIR_STEM_NOTES[next]) {
        next += 1;
      }
    }

    if (next < CHOIR_STEM_NOTES.length) {
      throw new Error(
        `expected ${CHOIR_STEM_NOTES.join(', ')} in order, the monitor showed ${heard.join(' ')}`,
      );
    }

    pass(`The pitch monitor shows ${CHOIR_STEM_NOTES.join(', ')} in order`);

    if (centsOff.some((cents) => cents > MAX_CENTS_OFF)) {
      throw new Error('a reading was more than 50 cents from its note');
    }

    pass(
      'Each reading says how many cents it is from the note, never more than 50',
    );

    // Turning it off closes the monitor.
    await page.getByLabel('Close pitch detection').click();
    await page
      .getByLabel('Pitch monitor')
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    pass('Closing pitch detection removes the monitor');
  },
});
