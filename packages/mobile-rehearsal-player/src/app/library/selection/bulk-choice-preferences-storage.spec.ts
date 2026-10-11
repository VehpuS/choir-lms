import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { DEFAULT_BULK_CHOICE_PREFERENCES } from './bulk-choices.js';
import {
  BULK_CHOICE_PREFERENCES_KEY,
  persistBulkChoicePreferences,
  resetBulkChoicePreferences,
  restoreBulkChoicePreferences,
} from './bulk-choice-preferences-storage.js';

// A lightweight in-memory fake for the AsyncStorage surface the module uses.
const createFakeStorage = () => {
  const records = new Map<string, string>();

  return {
    records,
    getItem: async (key: string) => records.get(key) ?? null,
    removeItem: async (key: string) => void records.delete(key),
    setItem: async (key: string, value: string) => void records.set(key, value),
  };
};

describe('bulk choice preferences storage', () => {
  let storage = createFakeStorage();

  beforeEach(() => {
    storage = createFakeStorage();
  });

  it('falls back to asking when nothing is stored', async () => {
    assert.deepEqual(
      await restoreBulkChoicePreferences(storage),
      DEFAULT_BULK_CHOICE_PREFERENCES,
    );
  });

  it('round-trips both defaults', async () => {
    const preferences = {
      playlistsInFolders: 'include',
      repeatedItems: 'remove',
    } as const;

    await persistBulkChoicePreferences(preferences, storage);

    assert.deepEqual(await restoreBulkChoicePreferences(storage), preferences);
  });

  it('falls back per field for an unknown value', async () => {
    storage.records.set(
      BULK_CHOICE_PREFERENCES_KEY,
      JSON.stringify({ playlistsInFolders: 'maybe', repeatedItems: 'keep' }),
    );

    assert.deepEqual(await restoreBulkChoicePreferences(storage), {
      playlistsInFolders: 'ask',
      repeatedItems: 'keep',
    });
  });

  it('falls back to asking for corrupt JSON', async () => {
    storage.records.set(BULK_CHOICE_PREFERENCES_KEY, '{not json');

    assert.deepEqual(
      await restoreBulkChoicePreferences(storage),
      DEFAULT_BULK_CHOICE_PREFERENCES,
    );
  });

  it('resets to asking', async () => {
    await persistBulkChoicePreferences(
      { playlistsInFolders: 'skip', repeatedItems: 'keep' },
      storage,
    );
    await resetBulkChoicePreferences(storage);

    assert.deepEqual(
      await restoreBulkChoicePreferences(storage),
      DEFAULT_BULK_CHOICE_PREFERENCES,
    );
  });
});
