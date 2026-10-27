/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSavedTrackAudioCache } from './saved-track-audio-cache.js';
import { readStoredSavedTrackBlob } from './saved-track-stored-copy.js';
import { StoredCopyUnavailableError } from './stored-copy-unavailable-error.js';

const URL = 'https://www.googleapis.com/drive/v3/files/file-a?alt=media';
const blobOf = (text: string) => new Blob([text]);

const setup = (stored: Blob | null = null) => {
  const cache = createSavedTrackAudioCache(1000);
  const reads: string[] = [];

  return {
    cache,
    dependencies: {
      cache,
      isOffline: () => true,
      persistence: {
        read: async (driveFileId: string, version: string) => {
          reads.push(`${driveFileId}@${version}`);

          return stored;
        },
      },
    },
    reads,
  };
};

describe('stored saved track copy', () => {
  it('serves the in-memory copy without reading storage', async () => {
    const { cache, dependencies, reads } = setup();
    const blob = blobOf('memory');

    cache.set('file-a', 'v1', blob);

    assert.equal(
      await readStoredSavedTrackBlob({ url: URL, version: 'v1' }, dependencies),
      blob,
    );
    assert.deepEqual(reads, []);
  });

  it('reads the stored copy at the library version and keeps it in memory', async () => {
    const stored = blobOf('stored');
    const { cache, dependencies, reads } = setup(stored);

    assert.equal(
      await readStoredSavedTrackBlob({ url: URL, version: 'v1' }, dependencies),
      stored,
    );
    assert.deepEqual(reads, ['file-a@v1']);
    assert.equal(cache.get('file-a', 'v1'), stored);
  });

  it('reports a missing copy with whether the device is offline', async () => {
    const { dependencies } = setup();

    await assert.rejects(
      readStoredSavedTrackBlob({ url: URL, version: 'v1' }, dependencies),
      (error: unknown) => {
        return error instanceof StoredCopyUnavailableError && error.isOffline;
      },
    );
  });

  it('does not guess a copy for a file with no known version', async () => {
    const { dependencies, reads } = setup(blobOf('stored'));

    await assert.rejects(
      readStoredSavedTrackBlob({ url: URL }, dependencies),
      StoredCopyUnavailableError,
    );
    assert.deepEqual(reads, []);
  });
});
