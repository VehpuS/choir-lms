import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildMyPartChip,
  learnPartName,
  resolveRequestedSelection,
} from './my-parts-model';
import {
  LATEST_PART_KEY,
  LEGACY_DEFAULT_VOICE_KEY,
  LEGACY_LATEST_VOICE_KEY,
  MY_PARTS_KEY,
  persistMyPartsPreferences,
  restoreMyPartsPreferences,
} from './my-parts-storage';

const named = (name: string) => ({ name });

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
    values,
  };
};

describe('resolveRequestedSelection', () => {
  it("keeps the source's own selection over any preference", () => {
    const preferences = { latestPart: 'Tenor', parts: ['Alto'] };

    assert.equal(resolveRequestedSelection('all', preferences), 'all');
    assert.deepEqual(
      resolveRequestedSelection({ include: ['1:Alto'] }, preferences),
      { include: ['1:Alto'] },
    );
  });

  it('asks for the list, then the learned part, when the source has no selection', () => {
    assert.deepEqual(
      resolveRequestedSelection(undefined, {
        latestPart: 'Tenor',
        parts: ['Alto 2', 'Alto'],
      }),
      { learnedPart: 'Tenor', preferParts: ['Alto 2', 'Alto'] },
    );
  });

  it('asks for nothing when there is no list and no learned part', () => {
    assert.equal(
      resolveRequestedSelection(undefined, {
        latestPart: undefined,
        parts: [],
      }),
      undefined,
    );
  });
});

describe('learnPartName', () => {
  it('names the part only when exactly one is showing', () => {
    assert.equal(learnPartName([named('Alto 2')]), 'Alto 2');
    assert.equal(learnPartName([named('Alto 1'), named('Alto 2')]), undefined);
    assert.equal(learnPartName([]), undefined);
  });
});

describe('buildMyPartChip', () => {
  it('offers the exact part name and puts it first when pressed', () => {
    assert.deepEqual(buildMyPartChip([named('Alto 2')], ['Lead']), {
      accessibilityLabel: 'Make Alto 2 my part',
      isOn: false,
      label: 'Make Alto 2 my part',
      nextParts: ['Alto 2', 'Lead'],
    });
  });

  it('reads as selected and removes the part when it is already listed', () => {
    const chip = buildMyPartChip([named('Alto 2')], ['Lead', 'alto-2']);

    assert.equal(chip?.label, 'Alto 2 is my part');
    assert.equal(chip?.isOn, true);
    assert.deepEqual(chip?.nextParts, ['Lead']);
  });

  it('is not offered when zero or several parts are showing', () => {
    assert.equal(buildMyPartChip([], []), undefined);
    assert.equal(buildMyPartChip([named('A'), named('B')], []), undefined);
  });
});

describe('my parts storage', () => {
  it('restores what was persisted', async () => {
    const storage = createMemoryStorage();

    await persistMyPartsPreferences(
      { latestPart: 'Lead', parts: ['Alto 2', 'Alto'] },
      storage,
    );

    assert.deepEqual(await restoreMyPartsPreferences(storage), {
      latestPart: 'Lead',
      parts: ['Alto 2', 'Alto'],
    });
  });

  it('removes a cleared latest part instead of storing a placeholder', async () => {
    const storage = createMemoryStorage({ [LATEST_PART_KEY]: 'Lead' });

    await persistMyPartsPreferences(
      { latestPart: undefined, parts: [] },
      storage,
    );

    assert.equal(storage.values.has(LATEST_PART_KEY), false);
    assert.equal(storage.values.get(MY_PARTS_KEY), '[]');
  });

  it('ignores a damaged list', async () => {
    const storage = createMemoryStorage({ [MY_PARTS_KEY]: '{not json' });

    assert.deepEqual(await restoreMyPartsPreferences(storage), {
      latestPart: undefined,
      parts: [],
    });
  });

  it("carries the first version's one-section keys over once", async () => {
    const storage = createMemoryStorage({
      [LEGACY_DEFAULT_VOICE_KEY]: 'baritone',
      [LEGACY_LATEST_VOICE_KEY]: 'alto',
    });

    assert.deepEqual(await restoreMyPartsPreferences(storage), {
      latestPart: 'Alto',
      parts: ['Baritone'],
    });
    assert.equal(storage.values.has(LEGACY_DEFAULT_VOICE_KEY), false);
    assert.equal(storage.values.has(LEGACY_LATEST_VOICE_KEY), false);
    assert.equal(storage.values.get(MY_PARTS_KEY), '["Baritone"]');
  });

  it("prefers the new list over the first version's default", async () => {
    const storage = createMemoryStorage({
      [LEGACY_DEFAULT_VOICE_KEY]: 'bass',
      [MY_PARTS_KEY]: '["Lead"]',
    });

    assert.deepEqual((await restoreMyPartsPreferences(storage)).parts, [
      'Lead',
    ]);
  });

  it('falls back to no preference when storage fails', async () => {
    const failing = {
      getItem: async () => {
        throw new Error('storage unavailable');
      },
      removeItem: async () => undefined,
      setItem: async () => undefined,
    };

    assert.deepEqual(await restoreMyPartsPreferences(failing), {
      latestPart: undefined,
      parts: [],
    });
  });
});
