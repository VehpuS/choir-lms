import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

import {
  buildMockLibraryStorageEntries,
  type MockLibrary,
} from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';

// Reusable live-browser session for the Expo web export: it serves `dist/`
// (with the single-page fallback Pages uses), seeds a mock library into
// localStorage before the app starts, and hands back a Playwright page. No
// Google sign-in or network is involved, so any remote session can drive it.
const DEFAULT_DIST_DIR = 'packages/mobile-rehearsal-player/dist';
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

export type MockLibrarySession = {
  browser: Browser;
  close: () => Promise<void>;
  page: Page;
  /** Reads what the app persisted under a storage key (parsed JSON), or null. */
  readStored: <T = unknown>(key: string) => Promise<T | null>;
  url: string;
};

export const openMockLibrarySession = async (options: {
  distDir?: string;
  library: MockLibrary;
  viewport?: { height: number; width: number };
}): Promise<MockLibrarySession> => {
  const server = await startStaticServer(options.distDir ?? DEFAULT_DIST_DIR);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const url = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: options.viewport ?? { height: 844, width: 390 },
  });
  const entries = buildMockLibraryStorageEntries(options.library);

  // Runs before any app code, so the library is there on first read.
  await context.addInitScript((storageEntries) => {
    for (const [key, value] of Object.entries(storageEntries)) {
      window.localStorage.setItem(key, value);
    }
  }, entries);

  const page = await context.newPage();

  await page.goto(url);

  return {
    browser,
    close: async () => {
      await browser.close();
      server.close();
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
