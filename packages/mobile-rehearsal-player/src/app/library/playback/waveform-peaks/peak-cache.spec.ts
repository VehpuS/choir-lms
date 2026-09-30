/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createWaveformPeakCache,
  resolveWaveformSourceVersion,
} from './peak-cache.js';
import { createMemoryPeakStore, createTestPeaks } from './peak-test-helpers.js';

const HOUR_MS = 60 * 60 * 1000;

describe('waveform peak cache', () => {
  it('returns peaks written for the same file and version', async () => {
    const { store } = createMemoryPeakStore();
    const cache = createWaveformPeakCache({ budgetBytes: 100, store });

    await cache.write('file-1', 'v1', createTestPeaks([1, 2, 3]));

    assert.deepEqual(
      Array.from((await cache.read('file-1', 'v1'))?.buckets ?? []),
      [1, 2, 3],
    );
  });

  it('drops peaks when the Drive content version changed', async () => {
    const { records, store } = createMemoryPeakStore();
    const cache = createWaveformPeakCache({ budgetBytes: 100, store });

    await cache.write('file-1', '2026-01-01T00:00:00.000Z', createTestPeaks());

    assert.equal(await cache.read('file-1', '2026-02-01T00:00:00.000Z'), null);
    assert.equal(records.has('file-1'), false);
  });

  it('drops peaks written by another format version', async () => {
    const { records, store } = createMemoryPeakStore();
    const cache = createWaveformPeakCache({ budgetBytes: 100, store });

    await cache.write('file-1', 'v1', {
      ...createTestPeaks(),
      formatVersion: 0,
    });

    assert.equal(await cache.read('file-1', 'v1'), null);
    assert.equal(records.size, 0);
  });

  it('evicts the least recently used entries once over budget', async () => {
    const { records, store } = createMemoryPeakStore();
    let clock = 0;
    const cache = createWaveformPeakCache({
      budgetBytes: 6,
      now: () => (clock += 1),
      store,
    });

    await cache.write('oldest', 'v1', createTestPeaks([1, 1, 1]));
    await cache.write('middle', 'v1', createTestPeaks([2, 2, 2]));
    await cache.write('newest', 'v1', createTestPeaks([3, 3, 3]));

    assert.deepEqual([...records.keys()].sort(), ['middle', 'newest']);
  });

  it('never evicts the entry it just wrote, even if it alone exceeds the budget', async () => {
    const { records, store } = createMemoryPeakStore();
    const cache = createWaveformPeakCache({ budgetBytes: 1, store });

    await cache.write('big', 'v1', createTestPeaks([1, 2, 3]));

    assert.deepEqual([...records.keys()], ['big']);
  });

  it('refreshes recency on a read after an hour, protecting a used entry from eviction', async () => {
    const { records, store } = createMemoryPeakStore();
    let clock = 0;
    const cache = createWaveformPeakCache({
      budgetBytes: 6,
      now: () => clock,
      store,
    });

    await cache.write('used', 'v1', createTestPeaks([1, 1, 1]));
    clock = 1;
    await cache.write('idle', 'v1', createTestPeaks([2, 2, 2]));
    clock = 2 * HOUR_MS;
    await cache.read('used', 'v1');
    clock = 2 * HOUR_MS + 1;
    await cache.write('new', 'v1', createTestPeaks([3, 3, 3]));

    assert.deepEqual([...records.keys()].sort(), ['new', 'used']);
  });

  it('versions by Drive modified time, with a stable fallback when absent', () => {
    assert.equal(
      resolveWaveformSourceVersion('2026-01-01T00:00:00.000Z'),
      '2026-01-01T00:00:00.000Z',
    );
    assert.equal(
      resolveWaveformSourceVersion(),
      resolveWaveformSourceVersion(),
    );
  });
});
