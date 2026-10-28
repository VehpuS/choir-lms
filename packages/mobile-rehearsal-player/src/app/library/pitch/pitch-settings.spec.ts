import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createPitchSettingsStore,
  DEFAULT_PITCH_SETTINGS,
  parsePitchSettings,
  PITCH_LEGACY_SENSITIVITY_KEY,
  PITCH_LEVEL_CUTOFF_KEY,
  PITCH_SHOW_OTHER_OCTAVE_KEY,
} from './pitch-settings.js';

const memoryStorage = (initial: Record<string, string> = {}) => {
  const values = { ...initial };

  return {
    values,
    getItem: async (key: string) => values[key] ?? null,
    setItem: async (key: string, value: string) => {
      values[key] = value;
    },
  };
};

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('parsePitchSettings', () => {
  it('defaults when nothing is stored', () => {
    assert.deepEqual(parsePitchSettings({}), DEFAULT_PITCH_SETTINGS);
    assert.equal(DEFAULT_PITCH_SETTINGS.showOtherOctave, false);
    assert.equal(DEFAULT_PITCH_SETTINGS.levelCutoffDb, -40);
  });

  it('reads valid stored values', () => {
    assert.deepEqual(
      parsePitchSettings({ levelCutoffDb: '-30', showOtherOctave: 'true' }),
      { levelCutoffDb: -30, showOtherOctave: true },
    );
  });

  it('falls back to defaults for anything odd', () => {
    assert.deepEqual(
      parsePitchSettings({ levelCutoffDb: 'loud', showOtherOctave: 'yes' }),
      DEFAULT_PITCH_SETTINGS,
    );
    assert.deepEqual(
      parsePitchSettings({ levelCutoffDb: null, showOtherOctave: null }),
      DEFAULT_PITCH_SETTINGS,
    );
  });
});

describe('parsePitchSettings cutoff', () => {
  it('clamps a stored cutoff into range', () => {
    assert.equal(
      parsePitchSettings({ levelCutoffDb: '-95' }).levelCutoffDb,
      -60,
    );
    assert.equal(parsePitchSettings({ levelCutoffDb: '0' }).levelCutoffDb, -20);
  });

  it('maps a retired sensitivity once, and prefers the new value', () => {
    const cutoff = (legacySensitivity: string, levelCutoffDb?: string) =>
      parsePitchSettings({ legacySensitivity, levelCutoffDb }).levelCutoffDb;

    assert.equal(cutoff('low'), -34);
    assert.equal(cutoff('normal'), -40);
    assert.equal(cutoff('high'), -48);
    assert.equal(cutoff('loud'), -40);
    assert.equal(cutoff('high', '-30'), -30);
  });
});

describe('pitch settings store', () => {
  it('loads what was stored and tells subscribers', async () => {
    const settings = createPitchSettingsStore(
      memoryStorage({
        [PITCH_LEVEL_CUTOFF_KEY]: '-30',
        [PITCH_SHOW_OTHER_OCTAVE_KEY]: 'true',
      }),
    );
    let notified = 0;

    settings.subscribe(() => {
      notified += 1;
    });
    await settle();

    assert.deepEqual(settings.get(), {
      levelCutoffDb: -30,
      showOtherOctave: true,
    });
    assert.ok(notified > 0);
  });

  it('remembers each value on the device', async () => {
    const storage = memoryStorage();
    const settings = createPitchSettingsStore(storage);

    settings.set({ levelCutoffDb: -30 });
    settings.set({ showOtherOctave: true });
    await settle();

    assert.equal(storage.values[PITCH_LEVEL_CUTOFF_KEY], '-30');
    assert.equal(storage.values[PITCH_SHOW_OTHER_OCTAVE_KEY], 'true');

    settings.set({ showOtherOctave: false });
    await settle();
    assert.equal(storage.values[PITCH_SHOW_OTHER_OCTAVE_KEY], 'false');
  });

  it('writes only the value that changed', async () => {
    const storage = memoryStorage();
    const settings = createPitchSettingsStore(storage);

    settings.set({ levelCutoffDb: -30 });
    await settle();

    assert.deepEqual(Object.keys(storage.values), [PITCH_LEVEL_CUTOFF_KEY]);
  });

  it('keeps the other-octave value while only the cutoff is changed', async () => {
    const settings = createPitchSettingsStore(
      memoryStorage({ [PITCH_SHOW_OTHER_OCTAVE_KEY]: 'true' }),
    );

    await settings.load();
    settings.set({ levelCutoffDb: -30 });

    assert.equal(settings.get().showOtherOctave, true);
    assert.equal(settings.get().levelCutoffDb, -30);
  });

  it('survives the viewer row being absent: the value is read with no row involved', async () => {
    const storage = memoryStorage({ [PITCH_SHOW_OTHER_OCTAVE_KEY]: 'true' });
    const afterRestart = createPitchSettingsStore(storage);

    await afterRestart.load();

    assert.equal(afterRestart.get().showOtherOctave, true);
  });

  it('lets a choice made before the stored values arrived win', async () => {
    const settings = createPitchSettingsStore(
      memoryStorage({
        [PITCH_LEVEL_CUTOFF_KEY]: '-30',
        [PITCH_SHOW_OTHER_OCTAVE_KEY]: 'true',
      }),
    );

    settings.subscribe(() => undefined);
    settings.set({ levelCutoffDb: -30 });
    await settle();

    assert.equal(settings.get().levelCutoffDb, -30);
    assert.equal(settings.get().showOtherOctave, true);
  });

  it('clamps a chosen cutoff before keeping it', async () => {
    const storage = memoryStorage();
    const settings = createPitchSettingsStore(storage);

    settings.set({ levelCutoffDb: -5 });
    await settle();

    assert.equal(settings.get().levelCutoffDb, -20);
    assert.equal(storage.values[PITCH_LEVEL_CUTOFF_KEY], '-20');
  });

  it('carries a retired sensitivity over once by saving it under the new key', async () => {
    const storage = memoryStorage({ [PITCH_LEGACY_SENSITIVITY_KEY]: 'high' });
    const settings = createPitchSettingsStore(storage);

    await settings.load();
    await settle();

    assert.equal(settings.get().levelCutoffDb, -48);
    assert.equal(storage.values[PITCH_LEVEL_CUTOFF_KEY], '-48');
  });

  it('stops notifying after unsubscribe', async () => {
    const settings = createPitchSettingsStore(memoryStorage());
    let notified = 0;
    const unsubscribe = settings.subscribe(() => {
      notified += 1;
    });

    await settle();
    unsubscribe();
    const before = notified;
    settings.set({ levelCutoffDb: -30 });

    assert.equal(notified, before);
  });

  it('keeps working when storage fails', async () => {
    const settings = createPitchSettingsStore({
      getItem: async () => {
        throw new Error('no storage');
      },
      setItem: async () => {
        throw new Error('no storage');
      },
    });

    await settings.load();
    settings.set({ levelCutoffDb: -30 });
    await settle();

    assert.equal(settings.get().levelCutoffDb, -30);
  });
});
