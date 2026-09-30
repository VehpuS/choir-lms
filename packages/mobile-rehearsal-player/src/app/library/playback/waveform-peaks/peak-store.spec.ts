/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createWaveformPeakCache } from './peak-cache.js';
import { createAsyncStorageWaveformPeakStore } from './peak-store.js';
import { createTestPeaks } from './peak-test-helpers.js';

// A plain key-value fake of AsyncStorage: the store's own encoding and index
// are what is under test.
const createFakeStorage = () => {
  const values = new Map<string, string>();

  return {
    storage: {
      async getItem(key: string) {
        return values.get(key) ?? null;
      },
      async removeItem(key: string) {
        values.delete(key);
      },
      async setItem(key: string, value: string) {
        values.set(key, value);
      },
    },
    values,
  };
};

describe('AsyncStorage waveform peak store', () => {
  it('round-trips a record and lists its size', async () => {
    const { storage } = createFakeStorage();
    const store = createAsyncStorageWaveformPeakStore(storage);

    await store.put({
      key: 'file-1',
      peaks: createTestPeaks([4, 5, 6]),
      sourceVersion: 'v1',
      touchedAt: 7,
    });

    const record = await store.get('file-1');

    assert.deepEqual(Array.from(record?.peaks.buckets ?? []), [4, 5, 6]);
    assert.equal(record?.sourceVersion, 'v1');
    assert.deepEqual(await store.list(), [
      { key: 'file-1', sizeBytes: 3, touchedAt: 7 },
    ]);
  });

  it('replaces a record’s index entry on rewrite and removes it on delete', async () => {
    const { storage, values } = createFakeStorage();
    const store = createAsyncStorageWaveformPeakStore(storage);
    const record = {
      key: 'file-1',
      peaks: createTestPeaks(),
      sourceVersion: 'v1',
      touchedAt: 1,
    };

    await store.put(record);
    await store.put({ ...record, touchedAt: 2 });

    assert.equal((await store.list()).length, 1);

    await store.remove('file-1');

    assert.equal(await store.get('file-1'), null);
    assert.deepEqual(await store.list(), []);
    assert.equal(
      [...values.keys()].some((key) => key.includes('file-1')),
      false,
    );
  });

  it('treats corrupt stored data as a miss', async () => {
    const { storage, values } = createFakeStorage();
    const store = createAsyncStorageWaveformPeakStore(storage);

    values.set('choirlms:practice:peaks:file-1', '{not json');
    values.set('choirlms:practice:peaks-index', 'also not json');

    assert.equal(await store.get('file-1'), null);
    assert.deepEqual(await store.list(), []);
  });

  it('serves the cache’s eviction through its index', async () => {
    const { storage } = createFakeStorage();
    const store = createAsyncStorageWaveformPeakStore(storage);
    let clock = 0;
    const cache = createWaveformPeakCache({
      budgetBytes: 3,
      now: () => (clock += 1),
      store,
    });

    await cache.write('old', 'v1', createTestPeaks([1, 1, 1]));
    await cache.write('new', 'v1', createTestPeaks([2, 2, 2]));

    assert.equal(await cache.read('old', 'v1'), null);
    assert.ok(await cache.read('new', 'v1'));
  });
});
