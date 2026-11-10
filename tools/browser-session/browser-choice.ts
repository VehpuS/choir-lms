import { chromium, firefox, webkit, type BrowserType } from 'playwright';

// Which browser the scenarios run in: Chromium by default, WebKit or Firefox
// on demand (`run-scenarios.ts --browser=webkit`, which sets this variable for
// each scenario). Chromium-only features declare themselves, so a scenario that
// needs one is skipped under another browser instead of failing.
export type BrowserName = 'chromium' | 'firefox' | 'webkit';

export const BROWSER_ENV_VARIABLE = 'BROWSER_TEST_BROWSER';
const BROWSER_TYPES: Record<BrowserName, BrowserType> = {
  chromium,
  firefox,
  webkit,
};

export const isBrowserName = (value: string): value is BrowserName =>
  value in BROWSER_TYPES;

/** The browser selected for this run (Chromium unless asked otherwise). */
export const selectedBrowserName = (): BrowserName => {
  const requested = process.env[BROWSER_ENV_VARIABLE] ?? 'chromium';

  if (!isBrowserName(requested)) {
    throw new Error(
      `Unknown browser "${requested}"; use chromium, firefox or webkit.`,
    );
  }

  return requested;
};

export const browserTypeFor = (name: BrowserName): BrowserType =>
  BROWSER_TYPES[name];

/**
 * Why a scenario cannot run in the selected browser, or null when it can.
 * Features that only exist in Chromium: the fake microphone launch flags and
 * CPU throttling through the DevTools protocol.
 */
export const unmetRequirement = (options: {
  cpuThrottle?: number;
  microphone?: boolean;
  requires?: readonly BrowserName[];
}): string | null => {
  const name = selectedBrowserName();
  const needs: BrowserName[] = [...(options.requires ?? [])];

  if (options.microphone || (options.cpuThrottle ?? 1) > 1) {
    needs.push('chromium');
  }

  return needs.length > 0 && !needs.includes(name)
    ? `needs ${[...new Set(needs)].join(' or ')}, running ${name}`
    : null;
};
