import type { BrowserContext, Page } from 'playwright';

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
