import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BUILT_IN_SEARCH_SOURCES } from '@org/audio-library-models';

import {
  SEARCH_SOURCES_KEYS,
  persistSearchSources,
  restoreSearchSources,
} from './search-sources-storage';

const createMemoryStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));

  return {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    values,
  };
};

const CUSTOM = {
  id: 'custom-choir',
  label: 'Choir',
  urlTemplate: 'https://choir.example/?q={query}',
};

describe('search sources storage', () => {
  it('starts both lists from the built-ins when nothing is stored', async () => {
    const restored = await restoreSearchSources(createMemoryStorage());

    assert.deepEqual(restored.lyrics, BUILT_IN_SEARCH_SOURCES.lyrics);
    assert.deepEqual(
      restored['sheet-music'],
      BUILT_IN_SEARCH_SOURCES['sheet-music'],
    );
  });

  it('restores what was persisted for each kind separately', async () => {
    const storage = createMemoryStorage();

    await persistSearchSources('sheet-music', [CUSTOM], storage);

    const restored = await restoreSearchSources(storage);

    assert.deepEqual(restored['sheet-music'], [CUSTOM]);
    assert.deepEqual(restored.lyrics, BUILT_IN_SEARCH_SOURCES.lyrics);
  });

  it('ignores a damaged list and an unsafe address', async () => {
    const storage = createMemoryStorage({
      [SEARCH_SOURCES_KEYS.lyrics]: '{not json',
      [SEARCH_SOURCES_KEYS['sheet-music']]: JSON.stringify([
        { ...CUSTOM, urlTemplate: 'http://choir.example/?q={query}' },
      ]),
    });
    const restored = await restoreSearchSources(storage);

    assert.deepEqual(restored.lyrics, BUILT_IN_SEARCH_SOURCES.lyrics);
    assert.deepEqual(
      restored['sheet-music'],
      BUILT_IN_SEARCH_SOURCES['sheet-music'],
    );
  });

  it('falls back to the built-ins when storage fails', async () => {
    const failing = {
      getItem: async () => {
        throw new Error('storage unavailable');
      },
      setItem: async () => undefined,
    };

    assert.deepEqual(
      (await restoreSearchSources(failing)).lyrics,
      BUILT_IN_SEARCH_SOURCES.lyrics,
    );
  });
});
