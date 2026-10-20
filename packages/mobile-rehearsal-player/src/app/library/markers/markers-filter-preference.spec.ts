import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MARKERS_FILTER_KEY,
  parseMarkersFilter,
  persistMarkersFilter,
  restoreMarkersFilter,
} from './markers-filter-preference.js';

const createMemoryStorage = () => {
  const store = new Map<string, string>();

  return {
    store,
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

const failingStorage = {
  getItem: async () => {
    throw new Error('unavailable');
  },
  setItem: async () => {
    throw new Error('unavailable');
  },
};

describe('markers filter preference', () => {
  it('parses known values and falls back to all', () => {
    assert.equal(parseMarkersFilter('mine'), 'mine');
    assert.equal(parseMarkersFilter('all'), 'all');
    assert.equal(parseMarkersFilter('everything'), 'all');
    assert.equal(parseMarkersFilter(null), 'all');
    assert.equal(parseMarkersFilter(7), 'all');
  });

  it('defaults to all when nothing is stored', async () => {
    assert.equal(await restoreMarkersFilter(createMemoryStorage()), 'all');
  });

  it('remembers the choice under its device key', async () => {
    const storage = createMemoryStorage();

    await persistMarkersFilter('mine', storage);

    assert.equal(storage.store.get(MARKERS_FILTER_KEY), 'mine');
    assert.equal(await restoreMarkersFilter(storage), 'mine');
  });

  it('falls back to all for an unknown stored value', async () => {
    const storage = createMemoryStorage();

    storage.store.set(MARKERS_FILTER_KEY, 'bogus');

    assert.equal(await restoreMarkersFilter(storage), 'all');
  });

  it('treats unreadable storage as all and ignores a failed write', async () => {
    assert.equal(await restoreMarkersFilter(failingStorage), 'all');
    await persistMarkersFilter('mine', failingStorage);
  });
});
