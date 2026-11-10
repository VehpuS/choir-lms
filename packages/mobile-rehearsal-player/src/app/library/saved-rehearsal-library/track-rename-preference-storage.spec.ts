import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  persistTrackRenameCopiesChoice,
  restoreTrackRenameCopiesChoice,
  TRACK_RENAME_COPIES_CHOICE_KEY,
} from './track-rename-preference-storage';

const createMemoryStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));

  return {
    getItem: async (key: string) => values.get(key) ?? null,
    removeItem: async (key: string) => {
      values.delete(key);
    },
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
  };
};

describe('track rename copies choice storage', () => {
  it('round-trips a remembered choice and clears it', async () => {
    const storage = createMemoryStorage();

    assert.equal(await restoreTrackRenameCopiesChoice(storage), null);
    await persistTrackRenameCopiesChoice('all', storage);
    assert.equal(await restoreTrackRenameCopiesChoice(storage), 'all');
    await persistTrackRenameCopiesChoice(null, storage);
    assert.equal(await restoreTrackRenameCopiesChoice(storage), null);
  });

  it('ignores an unknown stored value', async () => {
    const storage = createMemoryStorage({
      [TRACK_RENAME_COPIES_CHOICE_KEY]: 'sometimes',
    });

    assert.equal(await restoreTrackRenameCopiesChoice(storage), null);
  });
});
