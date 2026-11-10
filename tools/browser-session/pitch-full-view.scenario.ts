import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { waitForTrack, waitUntil } from './page-helpers';
import { WAIT_MS } from './piano-helpers';
import { runScenario } from './scenario-runner';

// The full-screen pitch tool, opened from the monitor strip ("Open full view"):
// the sung note and its closeness, the roll of notes over time, holding a
// target note, zoom, the minimum-volume setting, Stop, and Back to monitor.
// The stem is the microphone and sings E4, C♯4, C4.
const SEQUENCE_TIMEOUT_MS = 25_000;
const SHORT_WAIT_MS = 1000;
const BACKDROP_X = 195;
const BACKDROP_Y = 100;
const NOTES = ['E4', 'C♯4', 'C4'];
const READOUT = /^([A-G][♯♭]?\d), [+-]?\d+ cents/;
const VOLUME_DB = /^[−-]\d+ dB$/;

const alto = buildMockSource('Alto Part');

void runScenario({
  library: { playlists: [], sources: [alto] },
  microphone: true,
  steps: async ({ page, pass, shot }) => {
    await waitForTrack(page, 'Alto Part').catch(() => undefined);
    await page.getByLabel('Practice tools', { exact: true }).click();
    await page.getByLabel('Pitch detection, off').click();
    await page.getByLabel('Pitch detection, on').waitFor({ timeout: WAIT_MS });
    await page
      .getByText('Got it', { exact: true })
      .click({ timeout: SHORT_WAIT_MS })
      .catch(() => undefined);
    await page.getByLabel('Close practice tools').first().click();
    await page.getByLabel('Pitch monitor').waitFor({ timeout: WAIT_MS });

    // Open the full view.
    await page.getByLabel('Open full view').click();
    await page.getByLabel('Back to monitor').waitFor({ timeout: WAIT_MS });
    await page
      .getByText('Pitch', { exact: true })
      .first()
      .waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Pitch progression').waitFor({ timeout: WAIT_MS });
    await shot('1-full-view');
    pass(
      'Open full view shows the Pitch screen with its roll, closeness and settings',
    );

    // The readout follows the sung notes, in order.
    const seen: string[] = [];

    await waitUntil(
      async () => {
        const labels = (await page.evaluate(
          `Array.from(document.querySelectorAll('[aria-label]')).map((e) => e.getAttribute('aria-label') ?? '')`,
        )) as string[];
        const note = labels
          .map((label) => READOUT.exec(label)?.[1])
          .find(Boolean);

        if (note && seen[seen.length - 1] !== note) {
          seen.push(note);
        }
        let next = 0;

        for (const item of seen) {
          if (item === NOTES[next]) {
            next += 1;
          }
        }

        return next === NOTES.length;
      },
      `the readout showed ${seen.join(', ') || 'nothing'}, not ${NOTES.join(', ')} in order`,
      SEQUENCE_TIMEOUT_MS,
    );
    pass('The readout shows E4, C♯4 and C4 as they are sung');

    // Hold a target note: the chip says so, and the readout compares to it.
    await page.getByText('Target: nearest note').waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Hold C4 as the target').click();
    await page.getByText('Target: C4 (held)').waitFor({ timeout: WAIT_MS });
    await page
      .getByText(/from C4/)
      .first()
      .waitFor({ timeout: SEQUENCE_TIMEOUT_MS });
    await shot('2-target-held');
    pass(
      'Holding C4 as the target shows it on the chip and measures the sung note from it',
    );
    await page.getByText('Target: C4 (held)').click();
    await page.getByText('Target: nearest note').waitFor({ timeout: WAIT_MS });
    pass('Pressing the held target lets it go again');

    // Zoom the roll.
    await page.getByText('10 s', { exact: true }).waitFor({ timeout: WAIT_MS });
    await page.getByLabel('Zoom out').click();
    await page
      .getByText('10 s', { exact: true })
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    await page.getByLabel('Zoom in').click();
    await page.getByText('10 s', { exact: true }).waitFor({ timeout: WAIT_MS });
    pass('Zoom out and in change the roll window and come back');

    // The minimum-volume setting.
    await page.getByLabel('Pitch settings').click();
    await page
      .getByText('Minimum volume', { exact: true })
      .waitFor({ timeout: WAIT_MS });
    const volume = page.getByText(VOLUME_DB).first();
    const before = await volume.textContent();

    await page.getByLabel('Louder minimum volume').click();
    await waitUntil(
      async () => (await volume.textContent()) !== before,
      'the minimum volume did not change',
    );
    await shot('3-settings');
    pass('The minimum volume can be changed in Pitch settings');
    // Tap the backdrop above the sheet (Escape would close the whole screen).
    await page.mouse.click(BACKDROP_X, BACKDROP_Y);
    await page
      .getByText('Minimum volume', { exact: true })
      .waitFor({ state: 'detached', timeout: WAIT_MS });

    // Stop listening, then back to the monitor strip.
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    await page
      .getByText('Listen', { exact: true })
      .first()
      .waitFor({ timeout: WAIT_MS });
    pass('Stop ends listening and offers Listen');

    await page.getByLabel('Back to monitor').click();
    await page
      .getByLabel('Back to monitor')
      .waitFor({ state: 'detached', timeout: WAIT_MS });
    await page.getByLabel('Pitch monitor').waitFor({ timeout: WAIT_MS });
    await shot('4-back-to-monitor');
    pass('Back to monitor returns to the strip, with Pitch detection still on');
  },
});
