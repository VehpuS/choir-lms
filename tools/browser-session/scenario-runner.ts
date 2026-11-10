import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from 'playwright';

import type { MockLibrary } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import {
  openMockLibrarySession,
  type MockLibrarySession,
  type MockWebFile,
} from './mock-library-session';

export type ScenarioContext = {
  page: Page;
  session: MockLibrarySession;
  /** Saves `<outDir>/<name>.png`. */
  shot: (name: string) => Promise<void>;
  /** Records a passing step. */
  pass: (step: string) => void;
};

/**
 * Runs a scenario against a mock library: opens the session, hands the steps a
 * page, a screenshot helper and a pass recorder, and exits non-zero on any
 * failure (with a `failure.png`). Lets a scenario read as steps, and be run by
 * the `browser-test` target as an automated browser test.
 */
export const runScenario = async (options: {
  library: MockLibrary;
  webFiles?: Record<string, MockWebFile>;
  steps: (context: ScenarioContext) => Promise<void>;
}) => {
  const outDir = process.argv[2] ?? 'browser-session-output';

  mkdirSync(outDir, { recursive: true });

  const session = await openMockLibrarySession({
    library: options.library,
    webFiles: options.webFiles,
  });
  const { page } = session;
  const results: string[] = [];
  const shot = async (name: string) => {
    await page.screenshot({ path: join(outDir, `${name}.png`) });
  };

  try {
    await options.steps({
      page,
      pass: (step) => results.push(`PASS ${step}`),
      session,
      shot,
    });
  } catch (error) {
    await shot('failure');
    results.push(`FAIL ${(error as Error).message.split('\n')[0]}`);
    process.exitCode = 1;
  } finally {
    console.log(results.join('\n'));
    await session.close();
  }
};
