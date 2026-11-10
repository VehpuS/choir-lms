import type { BrowserContext, Page } from 'playwright';

import {
  readAudioOutput,
  resetAudioOutput,
  type AudioOutput,
} from './audio-output-tap';

// The web player's media element is created outside the DOM, so
// `document.querySelector('audio')` finds nothing. This records every element
// the app starts playing (by wrapping `play`) so a scenario can read what the
// player is really doing: its position, speed and state. Opt in with the
// session's `mediaProbe` option; installed before any app code runs.
const PROBE_SCRIPT = `
(() => {
  const probe = { elements: [] };
  window.__mediaProbe = probe;

  const originalPlay = HTMLMediaElement.prototype.play;

  HTMLMediaElement.prototype.play = function (...args) {
    if (!probe.elements.includes(this)) {
      probe.elements.push(this);
    }

    return originalPlay.apply(this, args);
  };
})();
`;

export type MediaState = {
  currentTime: number;
  duration: number;
  paused: boolean;
  playbackRate: number;
};

export const installMediaProbe = async (context: BrowserContext) => {
  await context.addInitScript(PROBE_SCRIPT);
};

/** The state of the media element the app started most recently, or null before any. */
export const readMediaState = (page: Page): Promise<MediaState | null> =>
  page.evaluate(() => {
    const probe = (
      window as unknown as { __mediaProbe?: { elements: HTMLMediaElement[] } }
    ).__mediaProbe;
    const element = probe?.elements[probe.elements.length - 1];

    return element
      ? {
          currentTime: element.currentTime,
          duration: element.duration,
          paused: element.paused,
          playbackRate: element.playbackRate,
        }
      : null;
  });

// Capturing starts with a glitchy first few hundred milliseconds (the stream
// is still starting up), even at normal speed, so that part is dropped.
const CAPTURE_WARMUP_SECONDS = 0.5;
const MS_PER_SECOND = 1000;

/**
 * Records what the player's media element is producing, speed and pitch
 * handling included, for `seconds` of real time (after a short warm-up that is
 * dropped). Needs the session's `audioTap` (a `profile` turns it on) and
 * `mediaProbe`. For playback that goes through Web Audio (pitch shifting) read
 * the tap directly instead.
 */
export const captureMediaOutput = async (
  page: Page,
  seconds: number,
): Promise<AudioOutput> => {
  await resetAudioOutput(page);
  await page.evaluate(
    async ({ ms }) => {
      const probe = (
        window as unknown as { __mediaProbe?: { elements: HTMLMediaElement[] } }
      ).__mediaProbe;
      const element = probe?.elements[probe.elements.length - 1];

      if (!element) {
        throw new Error('No media element has been played yet');
      }

      const context = new AudioContext();

      await context.resume();

      const source = context.createMediaStreamSource(
        (
          element as unknown as { captureStream: () => MediaStream }
        ).captureStream(),
      );

      // Connected to the speakers so the audio tap hears it.
      source.connect(context.destination);
      await new Promise((resolve) => setTimeout(resolve, ms));
      source.disconnect();
    },
    { ms: (seconds + CAPTURE_WARMUP_SECONDS) * MS_PER_SECOND },
  );

  const output = await readAudioOutput(page);

  return {
    sampleRate: output.sampleRate,
    samples: output.samples.subarray(
      Math.round(CAPTURE_WARMUP_SECONDS * output.sampleRate),
    ),
  };
};
