import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

import {
  buildMockDriveStorageEntries,
  installMockDriveRoutes,
  type MockDriveAccount,
  type MockDriveRecorder,
} from './mock-drive-session';
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

export type MockLibrarySession = {
  /**
   * Throws if the page requested anything outside the local server that the
   * scenario had not mocked (`runScenario` calls this after the steps).
   */
  assertNoBlockedRequests: () => void;
  browser: Browser;
  close: () => Promise<void>;
  /**
   * Asserts the app tried to reach `urlPart` (an undeclared external request,
   * blocked by the guard) and marks it as expected, so the scenario still passes.
   */
  expectBlockedRequest: (urlPart: string) => void;
  /** What the mock Drive was asked; empty when the session has no `drive`. */
  drive: MockDriveRecorder;
  page: Page;
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
  /** Pixel density; 1 keeps screenshots small, 2-3 matches a phone screen. */
  deviceScaleFactor?: number;
  viewport?: { height: number; width: number };
}): Promise<MockLibrarySession> => {
  const server = await startStaticServer(options.distDir ?? DEFAULT_DIST_DIR);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const url = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
    viewport: options.viewport ?? { height: 844, width: 390 },
  });
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

  // Runs before any app code, so the library is there on first read.
  await context.addInitScript((storageEntries) => {
    for (const [key, value] of Object.entries(storageEntries)) {
      window.localStorage.setItem(key, value);
    }
  }, entries);

  for (const [fileUrl, file] of Object.entries(options.webFiles ?? {})) {
    await context.route(fileUrl, (route) =>
      route.fulfill({
        body: file.body,
        contentType: file.contentType,
        headers: { 'access-control-allow-origin': '*' },
      }),
    );
  }

  const page = await context.newPage();

  await page.goto(url);

  return {
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
