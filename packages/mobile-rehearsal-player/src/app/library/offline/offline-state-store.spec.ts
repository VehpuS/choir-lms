import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AudioStoreEntry } from '../playback/audio-cache/audio-store-types.js';
import { createOfflineStateStore } from './offline-state-store.js';

const entry = (driveFileId: string, pinned = false): AudioStoreEntry => ({
  driveFileId,
  pinned,
  sizeBytes: 10,
  sourceVersion: 'v1',
  touchedAt: 0,
});

const setup = (entries: AudioStoreEntry[]) => {
  let stored = entries;
  const listeners = new Set<() => void>();
  const store = createOfflineStateStore({
    list: async () => stored,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  });

  return {
    change: (next: AudioStoreEntry[]) => {
      stored = next;
      listeners.forEach((listener) => listener());
    },
    store,
  };
};

describe('offline state store', () => {
  it('reports none, available and kept from the stored files', async () => {
    const { store } = setup([entry('a'), entry('b', true)]);

    await store.refresh();

    assert.equal(store.getState('a'), 'available');
    assert.equal(store.getState('b'), 'kept');
    assert.equal(store.getState('c'), 'none');
  });

  it('reports downloading until the download ends, even for a stored file', async () => {
    const { store } = setup([entry('a')]);

    await store.refresh();
    const finish = store.markDownloading('a');
    assert.equal(store.getState('a'), 'downloading');

    finish();
    assert.equal(store.getState('a'), 'available');
  });

  it('keeps downloading until every overlapping download has ended', () => {
    const { store } = setup([]);
    const first = store.markDownloading('a');
    const second = store.markDownloading('a');

    first();
    assert.equal(store.getState('a'), 'downloading');

    second();
    assert.equal(store.getState('a'), 'none');
  });

  it('reads the cache again and notifies when it changes', async () => {
    const { change, store } = setup([]);
    let notifications = 0;

    store.subscribe(() => {
      notifications += 1;
    });
    change([entry('a', true)]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(store.getState('a'), 'kept');
    assert.equal(notifications, 1);
  });
});
