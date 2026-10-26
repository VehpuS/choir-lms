/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { blobOf, createMemoryAudioStore } from './audio-cache-test-helpers.js';
import { createPersistentAudioCache } from './persistent-audio-cache.js';

const HOUR_MS = 60 * 60 * 1000;

const setup = (budgetBytes = 100) => {
  const memory = createMemoryAudioStore();
  const clock = { now: 1000 };
  const cache = createPersistentAudioCache({
    budgetBytes,
    now: () => clock.now,
    store: memory.store,
  });

  return { cache, clock, memory };
};

describe('persistent audio cache', () => {
  it('returns the bytes written for a file at the same version', async () => {
    const { cache } = setup();
    const blob = blobOf(10);

    await cache.write('file-a', 'v1', blob);

    assert.equal(await cache.read('file-a', 'v1'), blob);
  });

  it('drops a stored file when Drive reports a different version', async () => {
    const { cache, memory } = setup();

    await cache.write('file-a', 'v1', blobOf(10));

    assert.equal(await cache.read('file-a', 'v2'), null);
    assert.equal(memory.records.size, 0);
  });

  it('evicts the least recently used files once over budget', async () => {
    const { cache, clock, memory } = setup(25);

    await cache.write('file-a', 'v1', blobOf(10));
    clock.now += 1;
    await cache.write('file-b', 'v1', blobOf(10));
    clock.now += 1;
    await cache.write('file-c', 'v1', blobOf(10));

    assert.deepEqual([...memory.records.keys()], ['file-b', 'file-c']);
  });

  it('refreshes a file’s recency on read only after the touch interval', async () => {
    const { cache, clock, memory } = setup();

    await cache.write('file-a', 'v1', blobOf(10));
    clock.now += HOUR_MS - 1;
    await cache.read('file-a', 'v1');
    assert.equal(memory.records.get('file-a')?.entry.touchedAt, 1000);

    clock.now += 2;
    await cache.read('file-a', 'v1');
    assert.equal(memory.records.get('file-a')?.entry.touchedAt, clock.now);
  });

  it('does not store a file larger than the whole budget', async () => {
    const { cache, memory } = setup(10);

    await cache.write('file-a', 'v1', blobOf(11));

    assert.equal(memory.records.size, 0);
  });

  it('treats a failing store as a miss and swallows failed writes', async () => {
    const failing = createPersistentAudioCache({
      budgetBytes: 100,
      store: {
        async clear() {
          throw new Error('unavailable');
        },
        async list() {
          throw new Error('unavailable');
        },
        async read() {
          throw new Error('unavailable');
        },
        async remove() {
          throw new Error('unavailable');
        },
        async touch() {
          throw new Error('unavailable');
        },
        async write() {
          throw new Error('unavailable');
        },
      },
    });

    await failing.write('file-a', 'v1', blobOf(10));

    assert.equal(await failing.read('file-a', 'v1'), null);
    await failing.clear();
  });

  it('clears every stored file', async () => {
    const { cache, memory } = setup();

    await cache.write('file-a', 'v1', blobOf(10));
    await cache.clear();

    assert.equal(memory.records.size, 0);
  });
});
