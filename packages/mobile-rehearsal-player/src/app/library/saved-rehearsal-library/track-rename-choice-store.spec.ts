import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackRenameChoiceStore } from './track-rename-choice-store';
import { TRACK_RENAME_COPIES_CHOICE_KEY } from './track-rename-preference-storage';

const createFakeStorage = (initial?: string) => {
  const records = new Map<string, string>();

  if (initial) {
    records.set(TRACK_RENAME_COPIES_CHOICE_KEY, initial);
  }

  return {
    records,
    getItem: async (key: string) => records.get(key) ?? null,
    removeItem: async (key: string) => void records.delete(key),
    setItem: async (key: string, value: string) => void records.set(key, value),
  };
};

describe('track rename choice store', () => {
  it('asks each time until a stored choice is read', async () => {
    const store = createTrackRenameChoiceStore(createFakeStorage('this'));

    assert.equal(store.getSnapshot(), null);
    assert.equal(await store.hydrate(), 'this');
    assert.equal(store.getSnapshot(), 'this');
  });

  it('changes the choice, notifies subscribers and persists it', async () => {
    const storage = createFakeStorage();
    const store = createTrackRenameChoiceStore(storage);
    let notifications = 0;

    store.subscribe(() => {
      notifications += 1;
    });
    await store.set('all');

    assert.equal(store.getSnapshot(), 'all');
    assert.equal(storage.records.get(TRACK_RENAME_COPIES_CHOICE_KEY), 'all');
    assert.ok(notifications >= 1);
  });

  it('clears the choice so the prompt returns', async () => {
    const storage = createFakeStorage('all');
    const store = createTrackRenameChoiceStore(storage);

    await store.set(null);

    assert.equal(store.getSnapshot(), null);
    assert.equal(storage.records.has(TRACK_RENAME_COPIES_CHOICE_KEY), false);
  });

  it('does not let the first read overwrite an early change', async () => {
    const store = createTrackRenameChoiceStore(createFakeStorage('this'));

    await store.set('all');
    await store.hydrate();

    assert.equal(store.getSnapshot(), 'all');
  });
});
