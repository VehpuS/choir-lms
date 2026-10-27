import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  blobOf,
  createMemoryAudioStore,
} from '../playback/audio-cache/audio-cache-test-helpers.js';
import { createPersistentAudioCache } from '../playback/audio-cache/persistent-audio-cache.js';
import { createOfflineStorageService } from './offline-storage-service.js';

const setup = async () => {
  const memory = createMemoryAudioStore();
  const cache = createPersistentAudioCache({
    budgetBytes: 1000,
    store: memory.store,
  });
  const calls = { cleared: 0, dropped: [] as string[] };
  const service = createOfflineStorageService({
    cache,
    memory: {
      clear: () => {
        calls.cleared += 1;
      },
      delete: (id) => {
        calls.dropped.push(id);
      },
    },
  });

  await cache.write('kept', 'v1', blobOf(10), { keep: true });
  await cache.write('auto-a', 'v1', blobOf(10));
  await cache.write('auto-b', 'v1', blobOf(10));

  return { calls, memory, service };
};

describe('offline storage service', () => {
  it('removes a selection from the store and the in-memory copy', async () => {
    const { calls, memory, service } = await setup();

    await service.removeMany(['kept', 'auto-a']);

    assert.deepEqual([...memory.records.keys()], ['auto-b']);
    assert.deepEqual(calls.dropped, ['kept', 'auto-a']);
  });

  it('clears the automatic cache and leaves kept files', async () => {
    const { calls, memory, service } = await setup();

    await service.clearAutomatic();

    assert.deepEqual([...memory.records.keys()], ['kept']);
    assert.deepEqual(calls.dropped.sort(), ['auto-a', 'auto-b']);
  });

  it('clears everything, kept files included', async () => {
    const { calls, memory, service } = await setup();

    await service.clearAll();

    assert.equal(memory.records.size, 0);
    assert.equal(calls.cleared, 1);
  });
});
