import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildMyPartChip,
  resolvePreferredVoice,
  resolveRequestedSelection,
  singleVisibleVoice,
} from './voice-part-preferences';
import {
  DEFAULT_VOICE_KEY,
  LATEST_VOICE_KEY,
  persistVoicePartPreferences,
  restoreVoicePartPreferences,
} from './voice-part-preferences-storage';

const vocal = (name: string) => ({ kind: 'vocal' as const, name });

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

describe('resolvePreferredVoice', () => {
  it('prefers the explicit default over the latest viewed part', () => {
    assert.equal(
      resolvePreferredVoice({ defaultVoice: 'alto', latestVoice: 'tenor' }),
      'alto',
    );
  });

  it('uses the latest viewed part while no default is set', () => {
    assert.equal(
      resolvePreferredVoice({ defaultVoice: undefined, latestVoice: 'tenor' }),
      'tenor',
    );
  });

  it('asks for nothing when neither is set', () => {
    assert.equal(
      resolvePreferredVoice({
        defaultVoice: undefined,
        latestVoice: undefined,
      }),
      undefined,
    );
  });
});

describe('resolveRequestedSelection', () => {
  it("keeps the source's own selection over the preferred voice", () => {
    assert.equal(resolveRequestedSelection('all', 'alto'), 'all');
    assert.deepEqual(
      resolveRequestedSelection({ include: ['1:Alto'] }, 'tenor'),
      { include: ['1:Alto'] },
    );
  });

  it('asks for the preferred voice only when the source has no selection', () => {
    assert.deepEqual(resolveRequestedSelection(undefined, 'bass'), {
      preferVoice: 'bass',
    });
    assert.equal(resolveRequestedSelection(undefined, undefined), undefined);
  });
});

describe('singleVisibleVoice', () => {
  it('names the section when every shown part belongs to it', () => {
    assert.equal(
      singleVisibleVoice([vocal('Alto 1'), vocal('Alto 2')]),
      'alto',
    );
  });

  it('is undefined across sections, for an unclassified part, or for nothing', () => {
    assert.equal(
      singleVisibleVoice([vocal('Alto'), vocal('Tenor')]),
      undefined,
    );
    assert.equal(singleVisibleVoice([vocal('Voice')]), undefined);
    assert.equal(singleVisibleVoice([]), undefined);
  });
});

describe('buildMyPartChip', () => {
  it("offers to make the shown section the singer's part", () => {
    assert.deepEqual(buildMyPartChip([vocal('Tenor')], undefined), {
      accessibilityLabel: 'Make Tenor my part',
      isOn: false,
      label: 'Make Tenor my part',
      nextDefault: 'tenor',
    });
  });

  it('reads as selected and clears the default when it already is the part', () => {
    const chip = buildMyPartChip([vocal('Tenor')], 'tenor');

    assert.equal(chip?.label, 'Tenor is my part');
    assert.equal(chip?.isOn, true);
    assert.equal(chip?.nextDefault, undefined);
  });

  it('is not offered when the shown parts span sections', () => {
    assert.equal(
      buildMyPartChip([vocal('Alto'), vocal('Tenor')], undefined),
      undefined,
    );
  });
});

describe('voice part storage', () => {
  it('restores what was persisted and ignores unknown values', async () => {
    const storage = createMemoryStorage({
      [DEFAULT_VOICE_KEY]: 'baritone',
      [LATEST_VOICE_KEY]: 'kazoo',
    });

    assert.deepEqual(await restoreVoicePartPreferences(storage), {
      defaultVoice: 'baritone',
      latestVoice: undefined,
    });
  });

  it('removes a cleared value instead of storing a placeholder', async () => {
    const storage = createMemoryStorage({ [DEFAULT_VOICE_KEY]: 'alto' });

    await persistVoicePartPreferences(
      { defaultVoice: undefined, latestVoice: 'tenor' },
      storage,
    );

    assert.equal(storage.values.has(DEFAULT_VOICE_KEY), false);
    assert.equal(storage.values.get(LATEST_VOICE_KEY), 'tenor');
  });

  it('falls back to no preference when storage fails', async () => {
    const failing = {
      getItem: async () => {
        throw new Error('storage unavailable');
      },
      removeItem: async () => undefined,
      setItem: async () => undefined,
    };

    assert.deepEqual(await restoreVoicePartPreferences(failing), {
      defaultVoice: undefined,
      latestVoice: undefined,
    });
  });
});
