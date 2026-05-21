/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveLibrarySource } from './drive-library-view-model.js';
import {
  loadSavedRehearsalLibrarySources,
  verifySavedRehearsalLibraryStorage,
} from './use-saved-rehearsal-library.js';

const SAVED_SOURCE: DriveLibrarySource = {
  id: 'drive:warmup-track',
  provider: 'google-drive',
  driveFileId: 'warmup-track',
  name: 'Warmup.mp3',
  mimeType: 'audio/mpeg',
  extension: 'mp3',
  durationMs: 92000,
  availability: {
    status: 'available',
  },
};

describe('loadSavedRehearsalLibrarySources', () => {
  it('returns saved sources on the first successful bootstrap read', async () => {
    const result = await loadSavedRehearsalLibrarySources(
      {
        async listSources() {
          return [SAVED_SOURCE];
        },
      },
      'local-device-user',
    );

    assert.deepEqual(result, [SAVED_SOURCE]);
  });

  it('retries the bootstrap read once before succeeding', async () => {
    let attemptCount = 0;

    const result = await loadSavedRehearsalLibrarySources(
      {
        async listSources() {
          attemptCount += 1;

          if (attemptCount === 1) {
            throw new Error('storage warming up');
          }

          return [SAVED_SOURCE];
        },
      },
      'local-device-user',
    );

    assert.equal(attemptCount, 2);
    assert.deepEqual(result, [SAVED_SOURCE]);
  });

  it('falls back to an empty bootstrap state when setup never succeeds', async () => {
    let attemptCount = 0;

    const result = await loadSavedRehearsalLibrarySources(
      {
        async listSources() {
          attemptCount += 1;
          throw new Error('storage unavailable');
        },
      },
      'local-device-user',
    );

    assert.equal(attemptCount, 2);
    assert.deepEqual(result, []);
  });
});

describe('verifySavedRehearsalLibraryStorage', () => {
  it('confirms storage readiness after a successful probe round-trip', async () => {
    const storage = new Map<string, string>();

    const result = await verifySavedRehearsalLibraryStorage({
      async getItem(key) {
        return storage.get(key) ?? null;
      },
      async removeItem(key) {
        storage.delete(key);
      },
      async setItem(key, value) {
        storage.set(key, value);
      },
    });

    assert.equal(result, true);
    assert.equal(storage.size, 0);
  });

  it('reports storage as unavailable when the probe write fails', async () => {
    const result = await verifySavedRehearsalLibraryStorage({
      async getItem() {
        return null;
      },
      async removeItem() {
        return;
      },
      async setItem() {
        throw new Error('quota exceeded');
      },
    });

    assert.equal(result, false);
  });
});