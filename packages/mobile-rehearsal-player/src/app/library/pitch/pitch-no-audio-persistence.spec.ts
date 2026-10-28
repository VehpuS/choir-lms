import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  PITCH_EXPLAINED_KEY,
  PITCH_HEADPHONES_DISMISSED_KEY,
  createPitchStore,
} from './pitch-store.js';
import {
  createFakePcmSource,
  createFakeStorage,
  createFakeVisibility,
  settle,
  sineFrames,
} from './pitch-test-support.js';

const here = dirname(fileURLToPath(import.meta.url));
const pitchDetectionSource = join(
  here,
  '../../../../../pitch-detection/src/lib',
);

// Anything that could keep audio or send it off the device. The microphone
// source is the only place that may touch media APIs, and none of these.
const FORBIDDEN_APIS = [
  'AsyncStorage',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'expo-file-system',
  'fetch(',
  'XMLHttpRequest',
  'WebSocket',
  'sendBeacon',
  'MediaRecorder',
  'googleapis',
] as const;

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory)
    .filter((name) => /\.tsx?$/.test(name) && !/\.spec\.tsx?$/.test(name))
    // The hook is the one place the real key-value store is imported, and it
    // only hands it to `createPitchStore`, which writes two flags, and to the
    // monitor preference, which writes the strip's on or off flag.
    .filter((name) => name !== 'use-pitch.ts')
    .filter((name) => name !== 'pitch-test-support.ts')
    .map((name) => join(directory, name));

const globals = globalThis as Record<string, unknown>;
const trapped = ['fetch', 'XMLHttpRequest', 'WebSocket'] as const;
const originals = trapped.map((name) => [name, globals[name]] as const);

afterEach(() => {
  originals.forEach(([name, value]) => {
    globals[name] = value;
  });
});

describe('pitch detection keeps and sends no audio', () => {
  it('stores only the two flags and never touches the network while listening', async () => {
    const calls: string[] = [];

    trapped.forEach((name) => {
      globals[name] = () => {
        calls.push(name);
        throw new Error(`${name} must not be used while listening`);
      };
    });

    const source = createFakePcmSource('granted');
    const storage = createFakeStorage();
    const store = createPitchStore({
      source,
      visibility: createFakeVisibility(),
      storage,
    });

    store.acquire();
    await store.requestListen();
    await settle();
    sineFrames(440, 30).forEach((frame) => source.emit(frame));
    store.dismissHeadphonesNote();
    store.stopListening();
    await settle();

    assert.deepEqual(calls, []);
    assert.ok(
      storage
        .writes()
        .every(
          ([key, value]) =>
            [PITCH_EXPLAINED_KEY, PITCH_HEADPHONES_DISMISSED_KEY].includes(
              key,
            ) && value === 'true',
        ),
    );
  });

  it('has no storage, network, or recording API in the pitch sources', () => {
    const files = [here, pitchDetectionSource].flatMap(sourceFiles);

    assert.ok(files.length > 10, 'expected to scan the pitch sources');

    for (const file of files) {
      const text = readFileSync(file, 'utf8');

      for (const api of FORBIDDEN_APIS) {
        assert.ok(!text.includes(api), `${file} uses ${api}`);
      }
    }
  });
});
