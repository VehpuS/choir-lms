import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  persistLyricsLookupDisclosureAcknowledged,
  restoreLyricsLookupDisclosureAcknowledged,
} from './lyrics-preferences-storage.js';

const createMemoryStorage = () => {
  const store = new Map<string, string>();

  return {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

describe('lyrics lookup disclosure preference', () => {
  it('defaults to not acknowledged and remembers an acknowledgement', async () => {
    const storage = createMemoryStorage();

    assert.equal(
      await restoreLyricsLookupDisclosureAcknowledged(storage),
      false,
    );
    await persistLyricsLookupDisclosureAcknowledged(storage);
    assert.equal(
      await restoreLyricsLookupDisclosureAcknowledged(storage),
      true,
    );
  });

  it('treats unreadable storage as not acknowledged', async () => {
    const failing = {
      getItem: async () => {
        throw new Error('unavailable');
      },
      setItem: async () => {
        throw new Error('unavailable');
      },
    };

    assert.equal(
      await restoreLyricsLookupDisclosureAcknowledged(failing),
      false,
    );
    await persistLyricsLookupDisclosureAcknowledged(failing);
  });
});
