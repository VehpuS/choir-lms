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

const SCORE = {
  driveFileId: 'score-1',
  name: 'Full score.pdf',
  url: 'https://drive.test/score-1',
};

const setup = (options: {
  budgetBytes?: number;
  download?: () => Blob;
  downloadScore?: (request: { driveFileId: string }) => Blob;
}) => {
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
    downloadScore: async (request) => {
      if (!options.downloadScore) {
        throw new Error('network');
      }

      return options.downloadScore(request);
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

  it('keeps a file larger than the whole cache size, since kept files are separate from it', async () => {
    const { keeping, memory } = setup({
      budgetBytes: 5,
      download: () => blobOf(10),
    });

    assert.equal(await keeping.keepOffline(REQUEST), 'kept');
    assert.equal(memory.records.get('file-a')?.entry.pinned, true);
  });

  it('reports a file the device refuses to store as not stored', async () => {
    const { keeping, memory } = setup({ download: () => blobOf(10) });

    memory.store.write = async () => {
      throw new Error('quota');
    };

    assert.equal(await keeping.keepOffline(REQUEST), 'not-stored');
  });

  it('removes a kept file’s stored and in-memory copies', async () => {
    const { calls, keeping, memory } = setup({ download: () => blobOf(10) });

    await keeping.keepOffline(REQUEST);
    await keeping.removeFromOffline('file-a');

    assert.equal(memory.records.size, 0);
    assert.deepEqual(calls.dropped, ['file-a']);
  });

  it('stores the file name with a kept download', async () => {
    const { cache, keeping } = setup({ download: () => blobOf(10) });

    await keeping.keepOffline({ ...REQUEST, name: 'Soprano.mp3' });

    const [stored] = await cache.list();

    assert.equal(stored?.name, 'Soprano.mp3');
  });

  it('keeps a track’s score files with it, owned by the track', async () => {
    const { cache, keeping } = setup({
      download: () => blobOf(10),
      downloadScore: () => blobOf(3),
    });

    await keeping.keepOffline({ ...REQUEST, scores: [SCORE] });

    const score = (await cache.list()).find(
      ({ driveFileId }) => driveFileId === 'score-1',
    );

    assert.equal(score?.kind, 'score');
    assert.equal(score?.pinned, true);
    assert.deepEqual(score?.ownerIds, ['file-a']);
    assert.equal(score?.name, 'Full score.pdf');
  });

  it('still keeps the audio when a score cannot be fetched, and says so', async () => {
    const { cache, keeping } = setup({ download: () => blobOf(10) });

    assert.equal(
      await keeping.keepOffline({ ...REQUEST, scores: [SCORE] }),
      'kept-partial',
    );
    assert.deepEqual(
      (await cache.list()).map(({ driveFileId }) => driveFileId),
      ['file-a'],
    );
  });

  it('downloads a score again only when its Drive version changed', async () => {
    let scoreDownloads = 0;
    const { cache, keeping } = setup({
      download: () => blobOf(10),
      downloadScore: () => {
        scoreDownloads += 1;

        return blobOf(3);
      },
    });
    const keepAt = (version: string) => {
      return keeping.keepOffline({
        ...REQUEST,
        scores: [{ ...SCORE, version }],
      });
    };

    await keepAt('2026-01-01');
    await keepAt('2026-01-01');
    assert.equal(scoreDownloads, 1);

    await keepAt('2026-02-01');
    assert.equal(scoreDownloads, 2);

    const score = (await cache.list()).find(
      ({ driveFileId }) => driveFileId === 'score-1',
    );

    assert.equal(score?.sourceVersion, '2026-02-01');
    assert.equal(score?.kind, 'score');
    assert.deepEqual(score?.ownerIds, ['file-a']);
  });

  it('adds scores when the track was already kept', async () => {
    const { cache, keeping } = setup({
      download: () => blobOf(10),
      downloadScore: () => blobOf(3),
    });

    await keeping.keepOffline(REQUEST);
    await keeping.keepOffline({ ...REQUEST, scores: [SCORE] });

    assert.equal((await cache.list()).length, 2);
  });

  it('removes a track’s scores with it but keeps a score another kept track uses', async () => {
    const { cache, keeping } = setup({
      download: () => blobOf(10),
      downloadScore: () => blobOf(3),
    });

    await keeping.keepOffline({ ...REQUEST, scores: [SCORE] });
    await keeping.keepOffline({
      ...REQUEST,
      driveFileId: 'file-b',
      scores: [SCORE],
    });
    await keeping.removeFromOffline('file-a');

    const left = await cache.list();

    assert.deepEqual(left.map(({ driveFileId }) => driveFileId).sort(), [
      'file-b',
      'score-1',
    ]);
    assert.deepEqual(left.find((e) => e.kind === 'score')?.ownerIds, [
      'file-b',
    ]);

    await keeping.removeFromOffline('file-b');
    assert.equal((await cache.list()).length, 0);
  });
});
