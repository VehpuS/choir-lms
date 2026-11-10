import {
  analyzeAudioQuality,
  centsBetween,
  type AudioQualityReport,
} from '../../packages/mobile-rehearsal-player/src/test-support/audio/audio-quality';
import { buildMockSource } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import type { DeviceProfile } from './device-profiles';
import { captureMediaOutput, readMediaState } from './media-probe';
import { buildToneMedia } from './mock-media';
import { waitForTrack, waitUntil } from './page-helpers';
import { runScenario } from './scenario-runner';

// Slowing a track must not make it sound sloppy. For each device profile this
// plays a steady 330 Hz tone at 1x, 0.75x, 0.5x and 0.25x (pitch kept), then
// shifted two semitones up, measures what the player produces, and fails on
// pitch drift, clicks, dropouts, clipping or a change in loudness.
// Shared by the matrix scenarios that run it on different devices, CPU speeds
// and sample rates (`browser-test-matrix`: it needs a quiet CPU and takes a while).
const TONE_HZ = 330;
const TONE_SECONDS = 90;
const CAPTURE_SECONDS = 3;
const WAIT_MS = 5000;
const SPEED_STEP_PRESSES = 5; // 0.05 each: a quarter-step of speed
const SPEEDS = [1, 0.75, 0.5, 0.25] as const;
const PITCH_STEPS = 2;
const SEMITONES_PER_OCTAVE = 12;
// Thresholds are the measured baseline plus a margin (see design.md, "Decisions
// on the open questions"), and every result is printed so a change shows up in
// review. The baseline is not silent, and follow-up F.8 traced why: a clean
// oscillator fed straight into the SoundTouch worklet at +2 semitones clicks
// about once a minute with no app code involved, and a bare `<audio>` element
// clicks once when its `playbackRate` changes to or from 1x (the browser's own
// time-stretcher). So a 3 s window may hold a click or two, which is not the
// app's to fix; the limits stay until the library or browser changes.
const MAX_PITCH_ERROR_CENTS = 15;
const MAX_CLICKS = 2;
const MAX_DROPOUT_MS = 25;
const MAX_LOUDNESS_DELTA_DB = 3;
// A speed change can leave one brief gap (about 22 ms, with two clicks) in the
// next second or two (follow-up F.8). Steady-state quality is measured after
// this settle time.
const SETTLE_MS = 2500;
const SHIFT_SETTLE_MS = SETTLE_MS;
const SHIFT_CAPTURE_SECONDS = 3;
const SHIFT_WARMUP_SECONDS = 1;

const tone = buildToneMedia({ hz: TONE_HZ, seconds: TONE_SECONDS });
const source = buildMockSource('Alto Part', {
  durationMs: TONE_SECONDS * 1000,
});

const describeReport = (report: AudioQualityReport, expectedHz: number) =>
  `pitch ${report.pitchHz === null ? 'none' : `${centsBetween(report.pitchHz, expectedHz).toFixed(1)} cents off`}, ` +
  `${report.clicks} clicks, ${report.longestDropoutMs} ms dropout, ` +
  `${report.clippedSamples} clipped, ${report.loudnessDb.toFixed(1)} dBFS`;

const checkReport = (
  label: string,
  report: AudioQualityReport,
  expectedHz: number,
  baselineDb: number | null,
) => {
  const problems: string[] = [];

  if (
    report.pitchHz === null ||
    Math.abs(centsBetween(report.pitchHz, expectedHz)) > MAX_PITCH_ERROR_CENTS
  ) {
    problems.push('pitch drifted');
  }

  if (report.clicks > MAX_CLICKS) problems.push('clicks');
  if (report.longestDropoutMs > MAX_DROPOUT_MS) problems.push('dropouts');
  if (report.clippedSamples > 0) problems.push('clipping');

  if (
    baselineDb !== null &&
    Math.abs(report.loudnessDb - baselineDb) > MAX_LOUDNESS_DELTA_DB
  ) {
    problems.push('loudness changed');
  }

  if (problems.length > 0) {
    throw new Error(
      `${label}: ${problems.join(', ')} (${describeReport(report, expectedHz)})`,
    );
  }
};

export const runSlowdownQuality = (profile: DeviceProfile) =>
  runScenario({
    drive: {
      media: { [source.driveFileId]: tone },
      state: 'authorized',
    },
    library: { playlists: [], sources: [source] },
    mediaProbe: true,
    profile,
    steps: async ({ page, pass, session, shot }) => {
      await waitForTrack(page, 'Alto Part');
      await page.getByLabel('Play Alto Part').first().click();
      await waitUntil(async () => {
        const state = await readMediaState(page);

        return state !== null && !state.paused && state.currentTime > 0;
      }, 'the track did not start playing');
      await page.getByLabel(/^Now playing:/).click();
      await page.getByLabel('Speed 1.00×. Open speed and pitch').click();
      await page.getByLabel('Speed', { exact: true }).focus();

      let baselineDb: number | null = null;

      for (const speed of SPEEDS) {
        const label = `${speed.toFixed(2)}×`;

        if (speed !== SPEEDS[0]) {
          for (let press = 0; press < SPEED_STEP_PRESSES; press += 1) {
            await page.keyboard.press('ArrowLeft');
          }
        }

        await page.getByLabel(`Speed ${label}`).waitFor({ timeout: WAIT_MS });
        await waitUntil(
          async () => (await readMediaState(page))?.playbackRate === speed,
          `the player is not running at ${label}`,
        );

        await page.waitForTimeout(SETTLE_MS);
        const output = await captureMediaOutput(page, CAPTURE_SECONDS);
        const report = analyzeAudioQuality(output.samples, output.sampleRate);
        const where = `${profile.name} at ${label}`;

        checkReport(where, report, TONE_HZ, baselineDb);
        baselineDb ??= report.loudnessDb;
        console.log(`  ${where}: ${describeReport(report, TONE_HZ)}`);
        pass(`${where}: the audio is clean`);
      }

      await shot(`${profile.name}-slowed`);

      // Pitch shifted: this path goes through the app's Web Audio shaper.
      await page.getByLabel('Reset speed and pitch').click();
      await page.getByLabel('Speed 1.00×').waitFor({ timeout: WAIT_MS });

      for (let step = 0; step < PITCH_STEPS; step += 1) {
        await page.getByLabel('Raise pitch by one semitone').click();
      }

      await page.getByLabel('Pitch +2 st').waitFor({ timeout: WAIT_MS });
      await page.waitForTimeout(SHIFT_SETTLE_MS);
      await session.resetAudioOutput();
      await page.waitForTimeout(
        (SHIFT_CAPTURE_SECONDS + SHIFT_WARMUP_SECONDS) * 1000,
      );

      const shifted = await session.readAudioOutput();
      const shiftedReport = analyzeAudioQuality(
        shifted.samples.subarray(
          Math.round(SHIFT_WARMUP_SECONDS * shifted.sampleRate),
        ),
        shifted.sampleRate,
      );
      const shiftedHz = TONE_HZ * 2 ** (PITCH_STEPS / SEMITONES_PER_OCTAVE);

      checkReport(
        `${profile.name} at +2 st`,
        shiftedReport,
        shiftedHz,
        baselineDb,
      );
      console.log(
        `  ${profile.name} at +2 st: ${describeReport(shiftedReport, shiftedHz)}`,
      );
      pass(`${profile.name} at +2 st: pitch is two semitones up and clean`);
    },
  });
