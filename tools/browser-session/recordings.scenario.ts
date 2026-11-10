import {
  createPitchPipeline,
  createPitchyEstimator,
} from '@org/pitch-detection';
import { midiToNoteName } from '@org/audio-library-models';

import { CHOIR_STEM_NOTES } from '../../packages/mobile-rehearsal-player/src/test-support/fixtures/choir-fixtures';
import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { readRecordedAudio } from './mock-recordings';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Recordings: record a take over a track with the stem as the microphone, stop,
// name it in the save sheet, find it in Recordings, play it back, and delete
// it. The take's audio is read back from the app's storage and run through the
// pitch pipeline, so it is the stem's E4, C♯4, C4 that was recorded.
const WAIT_MS = 5000;
const TONE_SECONDS = 40;
// The stem loops every ~3.8 s and its notes span ~2 s; this always holds them.
const RECORD_MS = 6500;
const FRAME_SAMPLES = 2048;
const TAKE_NAME = 'Verse take';
const RENAMED = 'Verse take 2';

const alto = buildMockSource('Alto Part', { durationMs: TONE_SECONDS * 1000 });

/** The distinct notes the app's pitch pipeline reads in recorded samples. */
const notesIn = (samples: Float32Array, sampleRate: number): string[] => {
  const pipeline = createPitchPipeline({ estimator: createPitchyEstimator() });
  const seen = new Map<number, string>();

  for (
    let start = 0;
    start + FRAME_SAMPLES <= samples.length;
    start += FRAME_SAMPLES
  ) {
    const reading = pipeline.process({
      samples: samples.subarray(start, start + FRAME_SAMPLES),
      sampleRate,
      timestampMs: ((start + FRAME_SAMPLES) * 1000) / sampleRate,
    });

    if (reading.active && !seen.has(reading.noteId)) {
      seen.set(reading.noteId, midiToNoteName(reading.midi));
    }
  }

  return [...seen.values()];
};

void runScenario({
  drive: {
    media: { [alto.driveFileId]: buildToneMedia({ seconds: TONE_SECONDS }) },
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

    // Turn the tool on, record, and stop.
    await page.getByLabel('Practice tools').last().click();
    await page.getByLabel('Recording, off').click();
    await page
      .getByText('Ready. Seek to where you want to start.')
      .waitFor({ timeout: WAIT_MS });
    await page.getByText('Record', { exact: true }).last().click();
    // The first recording asks to keep audio on the device.
    await page
      .getByText('Recording keeps audio on this device', { exact: false })
      .waitFor({ timeout: WAIT_MS });
    await shot('1-recording-consent');
    await page.getByText('Continue', { exact: true }).click();
    await page.getByLabel('Stop recording').waitFor({ timeout: WAIT_MS });
    pass('Record asks once about keeping audio on the device, then starts');

    // The timer runs while it records.
    await page
      .getByLabel(/^Recording, 0:0[2-9]$/)
      .waitFor({ timeout: WAIT_MS });
    await shot('2-recording');
    pass('The recording timer counts up while it records');

    await page.waitForTimeout(RECORD_MS);
    await page.getByLabel('Stop recording').click();
    await page.getByText('Recording saved').waitFor({ timeout: WAIT_MS });
    await page.getByText(/^0:0[6-9] · \d+ KB$/).waitFor({ timeout: WAIT_MS });
    await shot('3-save-sheet');
    pass('Stopping saves the take and shows its length and size');

    // Name it and finish.
    const name = page.getByRole('textbox').first();

    await name.fill(TAKE_NAME);
    await page.getByText('Done', { exact: true }).click();
    await page
      .getByText('Recording saved')
      .waitFor({ state: 'detached', timeout: WAIT_MS });

    // The saved take: complete, named, and its audio is what the microphone heard.
    await waitUntil(async () => {
      const [stored] = await readRecordedAudio(page);

      return (
        stored?.record.name === TAKE_NAME && stored.record.status === 'complete'
      );
    }, 'the take was not saved as a complete, named recording');

    const [take] = await readRecordedAudio(page);

    if (
      Math.abs(take.samples.length - take.record.sampleCount) > FRAME_SAMPLES
    ) {
      throw new Error('the stored audio is not the length the record says');
    }

    const notes = notesIn(take.samples, take.record.sampleRate);
    let next = 0;

    for (const note of notes) {
      if (note === CHOIR_STEM_NOTES[next]) {
        next += 1;
      }
    }

    console.log(`  the take holds: ${notes.join(' ')}`);
    if (next < CHOIR_STEM_NOTES.length) {
      throw new Error(
        `the take should hold ${CHOIR_STEM_NOTES.join(', ')}; it holds ${notes.join(' ')}`,
      );
    }

    pass(
      `The saved take is named, complete, and its audio holds ${CHOIR_STEM_NOTES.join(', ')}`,
    );

    // It is listed in Recordings under its track.
    await page
      .getByLabel('Close practice tools')
      .click()
      .catch(() => undefined);
    await page
      .getByLabel('Dismiss playback')
      .click()
      .catch(() => undefined);
    await page.getByLabel('Show Recordings library view').click();
    await page
      .getByText(TAKE_NAME, { exact: true })
      .first()
      .waitFor({ timeout: WAIT_MS });
    await shot('4-recordings-list');
    pass('The take is listed in Recordings');
    // Tapping it plays the take (over its track), with the take's own length.
    await page.getByLabel(/^Verse take\./).click();
    await page
      .getByText(/Playing · \d:\d\d of 0:0[6-9]/)
      .first()
      .waitFor({ timeout: WAIT_MS });
    await shot('5-playing-take');
    pass('Tapping the take plays it');

    // Rename it from its menu.
    await page.getByLabel('Options for Verse take').click();
    await page.getByText('Rename', { exact: true }).last().click();
    await page.getByRole('textbox').last().fill(RENAMED);
    await page.getByRole('button', { name: /Save/ }).last().click();
    await page
      .getByLabel(new RegExp(`^${RENAMED}\\.`))
      .waitFor({ timeout: WAIT_MS });
    await waitUntil(
      async () => (await readRecordedAudio(page))[0]?.record.name === RENAMED,
      'the new name was not saved',
    );
    pass('Rename changes the name in the list and in storage');

    // Delete it: it asks first, and the audio goes with the record.
    await page.getByLabel(`Options for ${RENAMED}`).click();
    await page.getByText('Delete', { exact: true }).last().click();
    await shot('6-delete-confirm');
    await page
      .getByRole('button', { name: /^Delete/ })
      .last()
      .click();
    await page
      .getByLabel(new RegExp(`^${RENAMED}\\.`))
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    await waitUntil(
      async () => (await readRecordedAudio(page)).length === 0,
      'the deleted recording is still stored',
    );
    pass('Delete removes the take from the list and from storage');
  },
});
