/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createWaveformPeakCache } from './peak-cache.js';
import { createWaveformPeakRegistry } from './peak-registry.js';
import { createMemoryPeakStore, createTestPeaks } from './peak-test-helpers.js';

const createRegistry = () => {
  const memory = createMemoryPeakStore();
  const cache = createWaveformPeakCache({
    budgetBytes: 1000,
    store: memory.store,
  });

  return { cache, memory, registry: createWaveformPeakRegistry(cache) };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('waveform peak registry', () => {
  it('has no peaks for a file nothing has analyzed', () => {
    const { registry } = createRegistry();

    registry.request('file-1', 'v1');

    assert.equal(registry.getSnapshot('file-1'), null);
  });

  it('loads persisted peaks when a view asks for the file and notifies subscribers', async () => {
    const { cache, registry } = createRegistry();
    let notifications = 0;

    await cache.write('file-1', 'v1', createTestPeaks([5, 6, 7]));
    registry.subscribe(() => {
      notifications += 1;
    });
    registry.request('file-1', 'v1');
    await settle();

    assert.deepEqual(
      Array.from(registry.getSnapshot('file-1')?.buckets ?? []),
      [5, 6, 7],
    );
    assert.equal(notifications, 1);
  });

  it('analyzes a download once, publishes the peaks, and persists them', async () => {
    const { memory, registry } = createRegistry();
    let extractions = 0;

    registry.request('file-1', 'v1');
    await registry.ingest('file-1', async () => {
      extractions += 1;
      return createTestPeaks([9, 9, 9]);
    });

    assert.equal(extractions, 1);
    assert.deepEqual(
      Array.from(registry.getSnapshot('file-1')?.buckets ?? []),
      [9, 9, 9],
    );
    assert.equal(memory.records.get('file-1')?.sourceVersion, 'v1');
  });

  it('skips analysis when persisted peaks already exist', async () => {
    const { cache, registry } = createRegistry();
    let extractions = 0;

    await cache.write('file-1', 'v1', createTestPeaks());
    registry.request('file-1', 'v1');
    await registry.ingest('file-1', async () => {
      extractions += 1;
      return createTestPeaks();
    });

    assert.equal(extractions, 0);
  });

  it('shares one analysis between concurrent downloads of the same file', async () => {
    const { registry } = createRegistry();
    let extractions = 0;
    const extract = async () => {
      extractions += 1;
      await settle();
      return createTestPeaks();
    };

    registry.request('file-1', 'v1');
    await Promise.all([
      registry.ingest('file-1', extract),
      registry.ingest('file-1', extract),
    ]);

    assert.equal(extractions, 1);
  });

  it('leaves the file without peaks when extraction is unavailable or fails', async () => {
    const { memory, registry } = createRegistry();

    registry.request('file-1', 'v1');
    await registry.ingest('file-1', async () => null);
    await registry.ingest('file-1', async () => {
      throw new Error('decode failed');
    });

    assert.equal(registry.getSnapshot('file-1'), null);
    assert.equal(memory.records.size, 0);
  });

  it('discards held peaks when the Drive version changes', async () => {
    const { registry } = createRegistry();

    registry.request('file-1', 'v1');
    await registry.ingest('file-1', async () => createTestPeaks());
    registry.request('file-1', 'v2');
    await settle();

    assert.equal(registry.getSnapshot('file-1'), null);
  });

  it('does not publish peaks analyzed for a version that was replaced mid-analysis', async () => {
    const { memory, registry } = createRegistry();

    registry.request('file-1', 'v1');
    const pending = registry.ingest('file-1', async () => {
      registry.request('file-1', 'v2');
      return createTestPeaks();
    });

    await pending;
    await settle();

    assert.equal(registry.getSnapshot('file-1'), null);
    assert.equal(memory.records.size, 0);
  });
});
