import {
  analyzeAudioQuality,
  centsBetween,
} from '../../packages/mobile-rehearsal-player/src/test-support/audio/audio-quality';
import { buildDefaultMockLibrary } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import { QUICK_PROFILES, type DeviceProfile } from './device-profiles';
import { runScenario } from './scenario-runner';

// Proves the audio measurement kit: the output tap hears what the page plays,
// the forced sample rate and device profile take effect, the analyzer reads
// the pitch and finds a deliberate dropout, and CPU throttling slows the page.
const TONE_HZ = 330;
const TONE_SECONDS = 1.5;
const DROPOUT_MS = 30;
const PITCH_TOLERANCE_CENTS = 10;
const MIN_DROPOUT_MS = 25;
const SLOWDOWN = 4;
const MIN_SLOWDOWN_SEEN = 2;
const BUSY_LOOP_ITERATIONS = 20_000_000;

const [phone, desktop] = QUICK_PROFILES;
const slowPhone: DeviceProfile = {
  ...phone,
  cpuThrottle: SLOWDOWN,
  name: 'pixel-7-cpu4x-48k',
};
let phoneBusyMs = 0;

const runOn = (profile: DeviceProfile) =>
  runScenario({
    library: buildDefaultMockLibrary(),
    profile,
    steps: async ({ page, pass, session }) => {
      await page.getByLabel('Alto Part options').first().waitFor();
      // A click is the user gesture that lets audio start.
      await page.mouse.click(10, 10);

      const busyMs = await page.evaluate((iterations) => {
        const started = performance.now();
        let sum = 0;

        for (let index = 0; index < iterations; index += 1) {
          sum += Math.sqrt(index);
        }

        return performance.now() - started + (sum < 0 ? 1 : 0);
      }, BUSY_LOOP_ITERATIONS);

      const playTone = (gapAtMs: number | null) =>
        page.evaluate(
          async ({ gapMs, hz, seconds }) => {
            const context = new AudioContext();

            await context.resume();

            const oscillator = context.createOscillator();
            const gain = context.createGain();

            oscillator.frequency.value = hz;
            // Fade in and out: a hard start or stop mid-cycle is itself a click.
            gain.gain.setValueAtTime(0, context.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.05);
            oscillator.connect(gain);
            gain.connect(context.destination);

            if (gapMs !== null) {
              const at = context.currentTime + seconds / 2;

              gain.gain.setValueAtTime(0, at);
              gain.gain.setValueAtTime(0.3, at + 0.03);
            }

            oscillator.start();
            gain.gain.setValueAtTime(0.3, context.currentTime + seconds - 0.05);
            gain.gain.linearRampToValueAtTime(0, context.currentTime + seconds);
            await new Promise((resolve) =>
              setTimeout(resolve, seconds * 1000 + 300),
            );
            oscillator.stop();

            const rate = context.sampleRate;

            await context.close();

            return rate;
          },
          { gapMs: gapAtMs, hz: TONE_HZ, seconds: TONE_SECONDS },
        );

      const contextRate = await playTone(null);

      if (contextRate !== profile.sampleRate) {
        throw new Error(
          `audio context ran at ${contextRate}, wanted ${profile.sampleRate}`,
        );
      }

      pass(
        `${profile.name}: the audio context runs at ${profile.sampleRate} Hz`,
      );

      const clean = await session.readAudioOutput();
      const cleanReport = analyzeAudioQuality(clean.samples, clean.sampleRate);

      if (
        cleanReport.pitchHz === null ||
        Math.abs(centsBetween(cleanReport.pitchHz, TONE_HZ)) >
          PITCH_TOLERANCE_CENTS ||
        cleanReport.clicks !== 0 ||
        cleanReport.longestDropoutMs !== 0
      ) {
        throw new Error(
          `clean tone measured badly: ${JSON.stringify(cleanReport)}`,
        );
      }

      pass(`${profile.name}: the tap hears a clean ${TONE_HZ} Hz tone`);

      await session.resetAudioOutput();
      await playTone(DROPOUT_MS);

      const gapped = await session.readAudioOutput();
      const gappedReport = analyzeAudioQuality(
        gapped.samples,
        gapped.sampleRate,
      );

      if (gappedReport.longestDropoutMs < MIN_DROPOUT_MS) {
        throw new Error(
          `the ${DROPOUT_MS} ms gap was not found: ${JSON.stringify(gappedReport)}`,
        );
      }

      pass(
        `${profile.name}: a ${DROPOUT_MS} ms dropout is found (${gappedReport.longestDropoutMs} ms)`,
      );

      if (profile === phone) {
        phoneBusyMs = busyMs;
      }

      if (profile === slowPhone && busyMs < phoneBusyMs * MIN_SLOWDOWN_SEEN) {
        throw new Error(
          `CPU throttle ${SLOWDOWN}x only slowed the page ${(busyMs / phoneBusyMs).toFixed(1)}x`,
        );
      }

      if (profile === slowPhone) {
        pass(
          `${profile.name}: ${SLOWDOWN}x CPU throttle slows the page (${(busyMs / phoneBusyMs).toFixed(1)}x)`,
        );
      }
    },
  });

void (async () => {
  await runOn(phone);
  await runOn(desktop);
  await runOn(slowPhone);
})();
