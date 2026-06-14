/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model.js';
import {
  loadSavedRehearsalLibrarySources,
  resolveSavedSourceDurationUpdate,
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

describe('resolveSavedSourceDurationUpdate', () => {
  it('returns a saved source with a learned duration when metadata was missing', () => {
    assert.deepEqual(
      resolveSavedSourceDurationUpdate(
        [
          {
            ...SAVED_SOURCE,
            durationMs: undefined,
          },
        ],
        SAVED_SOURCE.id,
        93000,
      ),
      {
        ...SAVED_SOURCE,
        durationMs: 93000,
      },
    );
  });

  it('skips updates when the saved source is missing or already has that duration', () => {
    assert.equal(
      resolveSavedSourceDurationUpdate([], SAVED_SOURCE.id, 93000),
      null,
    );
    assert.equal(
      resolveSavedSourceDurationUpdate(
        [
          {
            ...SAVED_SOURCE,
            durationMs: 93000,
          },
        ],
        SAVED_SOURCE.id,
        93000,
      ),
      null,
    );
  });
});
