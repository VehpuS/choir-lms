/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createWaveformPeakCache } from './peak-cache.js';
import { createWaveformPeakPrefetcher } from './peak-prefetch.js';
import { createWaveformPeakRegistry } from './peak-registry.js';
import { createMemoryPeakStore, createTestPeaks } from './peak-test-helpers.js';

const REQUEST = { headers: { Authorization: 'Bearer t' }, url: 'u' };

const setup = () => {
  const memory = createMemoryPeakStore();
  const cache = createWaveformPeakCache({
    budgetBytes: 1000,
    store: memory.store,
  });
  const registry = createWaveformPeakRegistry(cache);
  const calls = { downloads: 0, extractions: 0 };
  const prefetch = createWaveformPeakPrefetcher({
    download: async () => {
      calls.downloads += 1;
      await new Promise((resolve) => setTimeout(resolve, 0));
      return new Blob(['audio']);
    },
    extract: async () => {
      calls.extractions += 1;
      return createTestPeaks([7, 8, 9]);
    },
    registry,
  });

  return { cache, calls, memory, prefetch, registry };
};

describe('waveform peak prefetch', () => {
  it('downloads and analyzes a file nobody has played, then caches the peaks', async () => {
    const { calls, memory, prefetch, registry } = setup();

    await prefetch({ key: 'file-1', request: REQUEST, version: 'v1' });

    assert.deepEqual(calls, { downloads: 1, extractions: 1 });
    assert.deepEqual(
      Array.from(registry.getSnapshot('file-1')?.buckets ?? []),
      [7, 8, 9],
    );
    assert.equal(memory.records.get('file-1')?.sourceVersion, 'v1');
  });

  it('returns without waiting for the download when asked from the UI', async () => {
    const { calls, prefetch } = setup();
    const pending = prefetch({
      key: 'file-1',
      request: REQUEST,
      version: 'v1',
    });

    // The call is asynchronous: nothing has been fetched synchronously.
    assert.equal(calls.downloads, 0);

    await pending;
  });

  it('fetches nothing when the peaks are already cached', async () => {
    const { cache, calls, prefetch } = setup();

    await cache.write('file-1', 'v1', createTestPeaks());
    await prefetch({ key: 'file-1', request: REQUEST, version: 'v1' });

    assert.deepEqual(calls, { downloads: 0, extractions: 0 });
  });

  it('refetches when the Drive version changed since the peaks were cached', async () => {
    const { cache, calls, prefetch } = setup();

    await cache.write('file-1', 'old', createTestPeaks());
    await prefetch({ key: 'file-1', request: REQUEST, version: 'new' });

    assert.equal(calls.downloads, 1);
  });

  it('downloads a file once when asked again while it is being analyzed', async () => {
    const { calls, prefetch } = setup();

    await Promise.all([
      prefetch({ key: 'file-1', request: REQUEST, version: 'v1' }),
      prefetch({ key: 'file-1', request: REQUEST, version: 'v1' }),
    ]);

    assert.equal(calls.downloads, 1);
  });

  it('leaves the placeholder when the download or decode is unavailable', async () => {
    const { registry } = setup();
    const prefetch = createWaveformPeakPrefetcher({
      download: async () => null,
      extract: async () => {
        throw new Error('not reached');
      },
      registry,
    });

    await prefetch({ key: 'file-2', request: REQUEST, version: 'v1' });

    assert.equal(registry.getSnapshot('file-2'), null);
  });
});
