import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { writeFileSync } from 'node:fs';
import type { Browser, Page } from 'playwright';

import { browserTypeFor, selectedBrowserName } from './browser-choice';

import {
  installAudioOutputTap,
  readAudioOutput,
  resetAudioOutput,
  type AudioOutput,
} from './audio-output-tap';
import { contextOptionsFor, type DeviceProfile } from './device-profiles';
import {
  fakeMicrophoneLaunchArgs,
  prepareStemMicrophoneWav,
} from './fake-microphone';
import { installMediaProbe } from './media-probe';
import {
  installMockLyricsLookup,
  type MockLyricsCandidate,
  type MockLyricsRecorder,
} from './mock-lyrics';
import { fulfillMedia } from './mock-media';
import { seedMockRecordings } from './mock-recordings';
import {
  buildMockDriveStorageEntries,
  installMockDriveRoutes,
  type MockDriveAccount,
  type MockDriveRecorder,
} from './mock-drive-session';
import type { MockStoredRecording } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import {
  buildMockLibraryStorageEntries,
  type MockLibrary,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';

// Reusable live-browser session for the Expo web export: it serves `dist/`
// (with the single-page fallback Pages uses), seeds a mock library into
// localStorage before the app starts, and hands back a Playwright page. No
// Google sign-in or network is involved, so any remote session can drive it.
// Built by `build-browser-test`: the same app with a placeholder Google client
// id, so Reconnect is enabled (nothing real is ever contacted).
const DEFAULT_DIST_DIR = 'packages/mobile-rehearsal-player/dist-browser-test';
const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
};

const startStaticServer = (distDir: string): Promise<Server> =>
  new Promise((resolve) => {
    const server = createServer((request, response) => {
      const requested = normalize(
        decodeURIComponent((request.url ?? '/').split('?')[0]),
      ).replace(/^(\.\.[/\\])+/, '');
      const candidate = join(distDir, requested);
      const filePath =
        existsSync(candidate) && statSync(candidate).isFile()
          ? candidate
          : join(distDir, 'index.html');

      response.setHeader(
        'content-type',
        CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
      );
      createReadStream(filePath).pipe(response);
    });

    server.listen(0, () => resolve(server));
  });

/** A file the mock web serves at an address, with CORS open so the app may read it. */
export type MockWebFile = { body: Buffer; contentType: string };

/**
 * Console errors the app is known to log that a scenario need not fail on:
 * `ERR_FILE_NOT_FOUND` for a `blob:` URL, which is harmless (follow-up F.2 in
 * the browser tests change): it is Shaka's own MediaSource URL, created and
 * revoked inside Shaka when the app then sets the media element's `src` to its
 * own audio blob, which stays alive until reset or stop. And requests the
 * offline guard already reports on its own.
 */
const BASELINE_CONSOLE_ERRORS = [
  /Failed to load resource: net::ERR_FILE_NOT_FOUND/,
  /Failed to load resource: net::ERR_BLOCKED_BY_CLIENT/,
];

const FAILURE_CONSOLE_LINES = 8;

export type MockLibrarySession = {
  /**
   * Throws if the app logged console errors or uncaught page errors, apart
   * from the known baseline and any `ignore` patterns. Opt in per step.
   */
  expectNoConsoleErrors: (ignore?: RegExp[]) => void;
  /**
   * Writes what a failing scenario needs to be debugged into `outDir`:
   * `failure-trace.zip` (open with `npx playwright show-trace`) and
   * `failure-console.txt` (the console errors and warnings seen), and returns
   * the first console errors as one line for the run's log.
   */
  saveFailureEvidence: (outDir: string) => Promise<string>;
  /**
   * Throws if the page requested anything outside the local server that the
   * scenario had not mocked (`runScenario` calls this after the steps).
   */
  assertNoBlockedRequests: () => void;
  /**
   * Throws if the page's Content-Security-Policy blocked anything
   * (`runScenario` calls this after the steps).
   */
  assertNoCspViolations: () => void;
  browser: Browser;
  close: () => Promise<void>;
  /**
   * Asserts the app tried to reach `urlPart` (an undeclared external request,
   * blocked by the guard) and marks it as expected, so the scenario still passes.
   */
  expectBlockedRequest: (urlPart: string) => void;
  /**
   * Claims a Content-Security-Policy violation a scenario caused on purpose
   * (a message containing `part`), so it does not fail the run.
   */
  expectCspViolation: (part: string) => void;
  /** Searches the app made of the lyrics lookup service (see `lyricsLookup`). */
  lyricsSearches: MockLyricsRecorder['searches'];
  /** What the mock Drive was asked; empty when the session has no `drive`. */
  drive: MockDriveRecorder;
  page: Page;
  /** What reached the speakers since the last reset (needs `audioTap` or a `profile`). */
  readAudioOutput: () => Promise<AudioOutput>;
  /** Forgets the captured audio so far. */
  resetAudioOutput: () => Promise<void>;
  /** Reads what the app persisted under a storage key (parsed JSON), or null. */
  readStored: <T = unknown>(key: string) => Promise<T | null>;
  url: string;
};

export const openMockLibrarySession = async (options: {
  distDir?: string;
  /** The Google Drive account the app is signed in as; none by default (signed out). */
  drive?: MockDriveAccount;
  library: MockLibrary;
  /** Files served at absolute URLs, so links in the library load without a network. */
  webFiles?: Record<string, MockWebFile>;
  /**
   * Gives the page a microphone that plays the choir stem in a loop (Chromium's
   * fake capture device); permission is granted with no prompt.
   */
  microphone?: boolean;
  /**
   * Copies the page's audio output into a buffer (`readAudioOutput`), and
   * optionally forces the sample rate its audio contexts run at.
   */
  audioTap?: boolean | { sampleRate?: number };
  /**
   * Emulates a device: its viewport and touch, a slower CPU, and (with the
   * audio tap, which it turns on) a forced audio sample rate.
   */
  profile?: DeviceProfile;
  /**
   * Finished recordings to seed into the app's recordings database (records
   * only, no audio), built with `buildMockRecording`.
   */
  recordings?: MockStoredRecording[];
  /**
   * What the lyrics lookup service (LRCLIB) answers a search with; searches are
   * recorded in `session.lyricsSearches`.
   */
  lyricsLookup?: MockLyricsCandidate[];
  /**
   * Records the media elements the app plays so a scenario can read their
   * position, speed and state with `readMediaState(page)`.
   */
  mediaProbe?: boolean;
  /** Pixel density; 1 keeps screenshots small, 2-3 matches a phone screen. */
  deviceScaleFactor?: number;
  viewport?: { height: number; width: number };
}): Promise<MockLibrarySession> => {
  const server = await startStaticServer(options.distDir ?? DEFAULT_DIST_DIR);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const url = `http://127.0.0.1:${port}/`;
  const browserName = selectedBrowserName();
  const browser = await browserTypeFor(browserName).launch({
    args:
      options.microphone && browserName === 'chromium'
        ? fakeMicrophoneLaunchArgs(await prepareStemMicrophoneWav())
        : [],
  });
  const deviceScaleFactor =
    options.deviceScaleFactor ?? (options.profile ? undefined : 1);
  const viewport =
    options.viewport ??
    (options.profile ? undefined : { height: 844, width: 390 });
  const context = await browser.newContext({
    ...(options.profile ? contextOptionsFor(options.profile) : {}),
    // Only what was asked for: an `undefined` here would replace the device
    // descriptor's own viewport and pixel ratio with Playwright's defaults,
    // so a profile would run at 1280 x 720 instead of the phone it names.
    ...(deviceScaleFactor === undefined ? {} : { deviceScaleFactor }),
    ...(viewport === undefined ? {} : { viewport }),
  });
  const audioTap =
    options.audioTap ??
    (options.profile ? { sampleRate: options.profile.sampleRate } : false);

  if (audioTap) {
    await installAudioOutputTap(context, {
      sampleRate:
        typeof audioTap === 'object' ? audioTap.sampleRate : undefined,
    });
  }

  // The microphone only when the scenario asks for it; the clipboard always,
  // so "Copy" buttons can be checked by reading the clipboard back. Only
  // Chromium knows these permissions: Firefox rejects the grant, and WebKit
  // accepts it and then fails when the page opens. A scenario that needs the
  // clipboard or the microphone declares `requires: ['chromium']`.
  if (browserName === 'chromium') {
    await context.grantPermissions(
      options.microphone
        ? ['clipboard-read', 'clipboard-write', 'microphone']
        : ['clipboard-read', 'clipboard-write'],
      { origin: url },
    );
  }

  if (options.mediaProbe) {
    await installMediaProbe(context);
  }

  if (options.recordings?.length) {
    await seedMockRecordings(context, options.recordings);
  }

  const drive = options.drive ?? { state: 'signed-out' as const };
  const entries = {
    ...buildMockLibraryStorageEntries(options.library),
    ...buildMockDriveStorageEntries(drive),
  };
  // Registered first: Playwright runs the most recently added matching route,
  // so every mock installed after this (Drive, web files) wins and the guard
  // only sees what a scenario forgot to mock. Offline by construction.
  const blockedRequests: string[] = [];

  await context.route('**/*', (route) => {
    const requestUrl = route.request().url();

    if (new URL(requestUrl).origin === new URL(url).origin) {
      return route.fallback();
    }

    blockedRequests.push(requestUrl);

    return route.abort('blockedbyclient');
  });

  const recorder = await installMockDriveRoutes(context, drive);
  // After the guard, so this mock is checked first.
  const lyricsRecorder = options.lyricsLookup
    ? await installMockLyricsLookup(context, options.lyricsLookup)
    : { searches: [] };

  // Runs before any app code, so the library is there on first read.
  await context.addInitScript((storageEntries) => {
    for (const [key, value] of Object.entries(storageEntries)) {
      window.localStorage.setItem(key, value);
    }
  }, entries);

  for (const [fileUrl, file] of Object.entries(options.webFiles ?? {})) {
    await context.route(fileUrl, (route) => fulfillMedia(route, file));
  }

  // Recorded for the whole run; kept only when a scenario fails.
  await context.tracing.start({ screenshots: true, snapshots: true });

  // Content-Security-Policy violations, from the page's own
  // `securitypolicyviolation` event: its console wording differs per browser,
  // the event does not. Recorded on this side so a reload does not lose them.
  const cspViolations: string[] = [];

  await context.exposeFunction('__reportCspViolation', (detail: string) => {
    cspViolations.push(detail);
  });
  // Plain script text: it runs in the page, where the test tooling's helpers do not exist.
  await context.addInitScript(`
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__reportCspViolation(
        [event.effectiveDirective, event.blockedURI, (event.sample || '').slice(0, 60)].join('|'),
      );
    }, true);
  `);

  const page = await context.newPage();
  const consoleLog: { text: string; type: string }[] = [];

  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleLog.push({ text: message.text(), type: message.type() });
    }
  });
  page.on('pageerror', (error) => {
    consoleLog.push({ text: `Uncaught: ${error.message}`, type: 'error' });
  });
  const throttle = options.profile?.cpuThrottle ?? 1;

  if (throttle > 1) {
    const devtools = await context.newCDPSession(page);

    await devtools.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  }

  await page.goto(url);

  return {
    assertNoCspViolations: () => {
      if (cspViolations.length > 0) {
        throw new Error(
          `Content-Security-Policy violation(s): ${cspViolations.join(' | ')}`,
        );
      }
    },
    assertNoBlockedRequests: () => {
      if (blockedRequests.length > 0) {
        throw new Error(
          `Unmocked external request(s) blocked: ${blockedRequests.join(', ')}. Mock them (drive, webFiles) or fix the app.`,
        );
      }
    },
    browser,
    close: async () => {
      await browser.close();
      server.close();
    },
    drive: recorder,
    expectNoConsoleErrors: (ignore = []) => {
      const unexpected = consoleLog.filter(
        ({ text, type }) =>
          type === 'error' &&
          ![...BASELINE_CONSOLE_ERRORS, ...ignore].some((pattern) =>
            pattern.test(text),
          ),
      );

      if (unexpected.length > 0) {
        throw new Error(
          `Console errors: ${unexpected.map(({ text }) => text.slice(0, 160)).join(' | ')}`,
        );
      }
    },
    lyricsSearches: lyricsRecorder.searches,
    expectCspViolation: (part) => {
      const index = cspViolations.findIndex((violation) =>
        violation.includes(part),
      );

      if (index < 0) {
        throw new Error(`Expected a CSP violation containing ${part}`);
      }

      cspViolations.splice(index, 1);
    },
    expectBlockedRequest: (urlPart) => {
      const index = blockedRequests.findIndex((blocked) =>
        blocked.includes(urlPart),
      );

      if (index < 0) {
        throw new Error(`Expected a blocked request containing ${urlPart}`);
      }

      blockedRequests.splice(index, 1);
    },
    page,
    saveFailureEvidence: async (outDir) => {
      await context.tracing.stop({ path: join(outDir, 'failure-trace.zip') });
      writeFileSync(
        join(outDir, 'failure-console.txt'),
        consoleLog.map(({ text, type }) => `${type}: ${text}`).join('\n'),
      );

      // The console errors, for the run's log: the evidence files are in an
      // artifact, which is not always at hand when a browser-only failure is
      // being read from CI.
      return consoleLog
        .filter(
          ({ text, type }) =>
            type === 'error' &&
            !BASELINE_CONSOLE_ERRORS.some((pattern) => pattern.test(text)),
        )
        .slice(0, FAILURE_CONSOLE_LINES)
        .map(({ text }) => text.replace(/\s+/g, ' ').slice(0, 220))
        .join(' || ');
    },
    readAudioOutput: () => readAudioOutput(page),
    resetAudioOutput: () => resetAudioOutput(page),
    readStored: async <T = unknown>(key: string) => {
      const raw = await page.evaluate(
        (storageKey) => window.localStorage.getItem(storageKey),
        key,
      );

      return raw === null ? null : (JSON.parse(raw) as T);
    },
    url,
  };
};
