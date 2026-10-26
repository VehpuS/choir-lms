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
        async setPinned() {
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

  it('skips a kept file when evicting, taking the next oldest instead', async () => {
    const { cache, clock, memory } = setup(25);

    await cache.write('file-a', 'v1', blobOf(10));
    await cache.pin('file-a');
    clock.now += 1;
    await cache.write('file-b', 'v1', blobOf(10));
    clock.now += 1;
    await cache.write('file-c', 'v1', blobOf(10));

    assert.deepEqual([...memory.records.keys()], ['file-a', 'file-c']);
  });

  it('keeps every kept file even when they alone exceed the budget', async () => {
    const { cache, memory } = setup(15);

    await cache.write('file-a', 'v1', blobOf(10));
    await cache.pin('file-a');
    await cache.write('file-b', 'v1', blobOf(10));
    await cache.pin('file-b');
    await cache.write('file-c', 'v1', blobOf(5));

    // The file just written is protected too, so nothing is evicted at all.
    assert.deepEqual([...memory.records.keys()].sort(), [
      'file-a',
      'file-b',
      'file-c',
    ]);
  });

  it('cannot pin a file that is not stored', async () => {
    const { cache } = setup();

    assert.equal(await cache.pin('missing'), false);
  });

  it('keeps the pin when a changed version is downloaded again', async () => {
    const { cache, memory } = setup();

    await cache.write('file-a', 'v1', blobOf(10));
    await cache.pin('file-a');

    assert.equal(await cache.read('file-a', 'v2'), null);
    assert.equal(memory.records.size, 1);

    await cache.write('file-a', 'v2', blobOf(12));

    assert.equal(memory.records.get('file-a')?.entry.pinned, true);
    assert.equal(memory.records.get('file-a')?.entry.sourceVersion, 'v2');
  });

  it('unpins and removes files, notifying subscribers of each change', async () => {
    const { cache, memory } = setup();
    let notifications = 0;

    cache.subscribe(() => {
      notifications += 1;
    });
    await cache.write('file-a', 'v1', blobOf(10));
    await cache.pin('file-a');
    await cache.unpin('file-a');
    assert.equal(memory.records.get('file-a')?.entry.pinned, false);

    await cache.remove('file-a');

    assert.equal(memory.records.size, 0);
    assert.equal(notifications, 4);
  });
});
