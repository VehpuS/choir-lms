import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createBulkChoicePreferencesStore } from './bulk-choice-preferences-store.js';

// A lightweight in-memory fake for the AsyncStorage surface the store uses.
const createFakeStorage = (initial?: string) => {
  const records = new Map<string, string>();

  if (initial) {
    records.set('choirlms.selection.bulk-choices', initial);
  }

  return {
    records,
    getItem: async (key: string) => records.get(key) ?? null,
    removeItem: async (key: string) => void records.delete(key),
    setItem: async (key: string, value: string) => void records.set(key, value),
  };
};

describe('bulk choice preferences store', () => {
  it('starts on ask-each-time and hydrates the stored defaults once', async () => {
    const storage = createFakeStorage(
      JSON.stringify({ playlistsInFolders: 'skip', repeatedItems: 'ask' }),
    );
    const store = createBulkChoicePreferencesStore(storage);

    assert.equal(store.getSnapshot().playlistsInFolders, 'ask');
    await store.hydrate();
    assert.equal(store.getSnapshot().playlistsInFolders, 'skip');
  });

  it('merges an update, notifies subscribers and persists it', async () => {
    const storage = createFakeStorage();
    const store = createBulkChoicePreferencesStore(storage);
    let notifications = 0;

    store.subscribe(() => {
      notifications += 1;
    });
    await store.update({ repeatedItems: 'remove' });

    assert.equal(store.getSnapshot().repeatedItems, 'remove');
    assert.equal(store.getSnapshot().playlistsInFolders, 'ask');
    assert.ok(notifications >= 1);
    assert.match(
      storage.records.get('choirlms.selection.bulk-choices') ?? '',
      /"remove"/,
    );
  });

  it('resets both defaults and clears the stored record', async () => {
    const storage = createFakeStorage(
      JSON.stringify({ playlistsInFolders: 'include', repeatedItems: 'keep' }),
    );
    const store = createBulkChoicePreferencesStore(storage);

    await store.reset();

    assert.deepEqual(store.getSnapshot(), {
      playlistsInFolders: 'ask',
      repeatedItems: 'ask',
    });
    assert.equal(storage.records.size, 0);
  });

  it('stops notifying an unsubscribed listener', async () => {
    const store = createBulkChoicePreferencesStore(createFakeStorage());
    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications += 1;
    });

    unsubscribe();
    await store.update({ playlistsInFolders: 'skip' });

    assert.equal(notifications, 0);
  });
});
