import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  blobOf,
  createMemoryAudioStore,
} from '../playback/audio-cache/audio-cache-test-helpers.js';
import { createPersistentAudioCache } from '../playback/audio-cache/persistent-audio-cache.js';
import { createOfflineKeeping } from './offline-keeping.js';

const REQUEST = {
  driveFileId: 'file-a',
  url: 'https://drive.test/file-a',
  version: 'v1',
};

const setup = (options: { budgetBytes?: number; download?: () => Blob }) => {
  const memory = createMemoryAudioStore();
  const cache = createPersistentAudioCache({
    budgetBytes: options.budgetBytes ?? 100,
    store: memory.store,
  });
  const calls = { downloads: 0, dropped: [] as string[], downloading: 0 };
  const keeping = createOfflineKeeping({
    cache,
    download: async () => {
      calls.downloads += 1;

      if (!options.download) {
        throw new Error('network');
      }

      return options.download();
    },
    memory: {
      delete: (id) => {
        calls.dropped.push(id);
      },
    },
    state: {
      markDownloading: () => {
        calls.downloading += 1;

        return () => {
          calls.downloading -= 1;
        };
      },
    },
  });

  return { cache, calls, keeping, memory };
};

describe('keeping a file offline', () => {
  it('downloads an uncached file, stores it and pins it', async () => {
    const { calls, keeping, memory } = setup({ download: () => blobOf(10) });

    assert.equal(await keeping.keepOffline(REQUEST), 'kept');
    assert.equal(calls.downloads, 1);
    assert.equal(memory.records.get('file-a')?.entry.pinned, true);
    assert.equal(calls.downloading, 0);
  });

  it('pins an already stored file without downloading it again', async () => {
    const { cache, calls, keeping, memory } = setup({});

    await cache.write('file-a', 'v1', blobOf(10));

    assert.equal(await keeping.keepOffline(REQUEST), 'kept');
    assert.equal(calls.downloads, 0);
    assert.equal(memory.records.get('file-a')?.entry.pinned, true);
  });

  it('leaves nothing pinned and clears the downloading state when the download fails', async () => {
    const { calls, keeping, memory } = setup({});

    await assert.rejects(keeping.keepOffline(REQUEST), /network/);
    assert.equal(memory.records.size, 0);
    assert.equal(calls.downloading, 0);
  });

  it('reports a file larger than the whole budget as too large', async () => {
    const { keeping, memory } = setup({
      budgetBytes: 5,
      download: () => blobOf(10),
    });

    assert.equal(await keeping.keepOffline(REQUEST), 'too-large');
    assert.equal(memory.records.size, 0);
  });

  it('removes a kept file’s stored and in-memory copies', async () => {
    const { calls, keeping, memory } = setup({ download: () => blobOf(10) });

    await keeping.keepOffline(REQUEST);
    await keeping.removeFromOffline('file-a');

    assert.equal(memory.records.size, 0);
    assert.deepEqual(calls.dropped, ['file-a']);
  });
});
