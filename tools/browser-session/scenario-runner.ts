import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from 'playwright';

import type { MockLibrary } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-fixtures';
import type { MockStoredRecording } from '../../packages/mobile-rehearsal-player/src/test-support/mock-library/mock-library-entities';
import type { DeviceProfile } from './device-profiles';
import type { MockDriveAccount } from './mock-drive-session';
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
  /** The Google Drive account to sign in as; see `openMockLibrarySession`. */
  drive?: MockDriveAccount;
  /** Capture the audio output; see `openMockLibrarySession`. */
  audioTap?: boolean | { sampleRate?: number };
  /** Emulate a device; see `openMockLibrarySession`. */
  profile?: DeviceProfile;
  /** Recordings to seed; see `openMockLibrarySession`. */
  recordings?: MockStoredRecording[];
  /** A fake microphone playing the choir stem; see `openMockLibrarySession`. */
  microphone?: boolean;
  /** Pixel density for the session; see `openMockLibrarySession`. */
  deviceScaleFactor?: number;
  webFiles?: Record<string, MockWebFile>;
  steps: (context: ScenarioContext) => Promise<void>;
}) => {
  const outDir = process.argv[2] ?? 'browser-session-output';

  mkdirSync(outDir, { recursive: true });

  const session = await openMockLibrarySession({
    deviceScaleFactor: options.deviceScaleFactor,
    drive: options.drive,
    audioTap: options.audioTap,
    library: options.library,
    profile: options.profile,
    microphone: options.microphone,
    recordings: options.recordings,
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
    // Offline guarantee: a request to an undeclared host fails the scenario.
    session.assertNoBlockedRequests();
  } catch (error) {
    await shot('failure');
    await session.saveFailureEvidence(outDir);
    results.push(`FAIL ${(error as Error).message.split('\n')[0]}`);
    process.exitCode = 1;
  } finally {
    console.log(results.join('\n'));
    await session.close();
  }
};
