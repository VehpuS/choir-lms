import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AUDIO_ROUTE_KEY,
  createAudioRouteStore,
  parseAudioRoute,
} from './audio-route-store';

const createFakeStorage = (initial?: string) => {
  const records = new Map<string, string>();

  if (initial) {
    records.set(AUDIO_ROUTE_KEY, initial);
  }

  return {
    records,
    getItem: async (key: string) => records.get(key) ?? null,
    setItem: async (key: string, value: string) => void records.set(key, value),
  };
};

describe('audio route store', () => {
  it('defaults to play-and-record and ignores unknown stored values', () => {
    assert.equal(parseAudioRoute(null), 'play-and-record');
    assert.equal(parseAudioRoute('loud'), 'play-and-record');
    assert.equal(parseAudioRoute('auto'), 'auto');
  });

  it('reads the stored route once, then changes and persists it', async () => {
    const storage = createFakeStorage('auto');
    const store = createAudioRouteStore(storage);

    assert.equal(await store.hydrate(), 'auto');
    await store.set('playback-after-open');

    assert.equal(store.getSnapshot(), 'playback-after-open');
    assert.equal(storage.records.get(AUDIO_ROUTE_KEY), 'playback-after-open');
  });

  it('is not overwritten by a read that finishes after a change', async () => {
    const store = createAudioRouteStore(createFakeStorage('auto'));

    await store.set('playback-after-open');
    await store.hydrate();

    assert.equal(store.getSnapshot(), 'playback-after-open');
  });
});
