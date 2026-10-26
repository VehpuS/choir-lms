import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AUDIO_CACHE_BUDGET_KEY,
  AUDIO_CACHE_BUDGET_PRESETS_BYTES,
  DEFAULT_AUDIO_CACHE_BUDGET_BYTES,
  createAudioCacheBudgetStore,
  parseAudioCacheBudget,
} from './audio-cache-budget.js';

const MEGABYTE = 1024 * 1024;

const createMemoryStorage = (initial?: string) => {
  const values = new Map<string, string>();

  if (initial !== undefined) {
    values.set(AUDIO_CACHE_BUDGET_KEY, initial);
  }

  return {
    values,
    async getItem(key: string) {
      return values.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
};

describe('audio cache budget', () => {
  it('defaults to 250 MB, one of the presets', () => {
    assert.equal(DEFAULT_AUDIO_CACHE_BUDGET_BYTES, 250 * MEGABYTE);
    assert.ok(
      AUDIO_CACHE_BUDGET_PRESETS_BYTES.includes(
        DEFAULT_AUDIO_CACHE_BUDGET_BYTES,
      ),
    );
  });

  it('falls back to the default for a value that is not a preset', () => {
    assert.equal(
      parseAudioCacheBudget('12345'),
      DEFAULT_AUDIO_CACHE_BUDGET_BYTES,
    );
    assert.equal(parseAudioCacheBudget(null), DEFAULT_AUDIO_CACHE_BUDGET_BYTES);
    assert.equal(
      parseAudioCacheBudget(String(1024 * MEGABYTE)),
      1024 * MEGABYTE,
    );
  });

  it('remembers the chosen size and restores it later', async () => {
    const storage = createMemoryStorage();
    const first = createAudioCacheBudgetStore(storage);

    await first.set(1024 * MEGABYTE);

    const second = createAudioCacheBudgetStore(storage);

    await second.restore();
    assert.equal(second.get(), 1024 * MEGABYTE);
  });

  it('notifies subscribers when the size changes', async () => {
    const store = createAudioCacheBudgetStore(createMemoryStorage());
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });

    await store.set(100 * MEGABYTE);
    await store.set(100 * MEGABYTE);
    unsubscribe();
    await store.set(500 * MEGABYTE);

    assert.equal(calls, 1);
  });

  it('keeps a size chosen while the restore was pending', async () => {
    const store = createAudioCacheBudgetStore(
      createMemoryStorage(String(2048 * MEGABYTE)),
    );
    const restoring = store.restore();

    await store.set(100 * MEGABYTE);
    await restoring;

    assert.equal(store.get(), 100 * MEGABYTE);
  });
});
