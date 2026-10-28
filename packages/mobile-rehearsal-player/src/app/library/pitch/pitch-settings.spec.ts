import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createPitchSettingsStore,
  DEFAULT_PITCH_SETTINGS,
  parsePitchSettings,
  PITCH_SENSITIVITY_KEY,
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
    assert.equal(DEFAULT_PITCH_SETTINGS.sensitivity, 'normal');
  });

  it('reads valid stored values', () => {
    assert.deepEqual(
      parsePitchSettings({ sensitivity: 'high', showOtherOctave: 'true' }),
      { sensitivity: 'high', showOtherOctave: true },
    );
  });

  it('falls back to defaults for anything odd', () => {
    assert.deepEqual(
      parsePitchSettings({ sensitivity: 'loud', showOtherOctave: 'yes' }),
      DEFAULT_PITCH_SETTINGS,
    );
    assert.deepEqual(
      parsePitchSettings({ sensitivity: null, showOtherOctave: null }),
      DEFAULT_PITCH_SETTINGS,
    );
  });
});

describe('pitch settings store', () => {
  it('loads what was stored and tells subscribers', async () => {
    const settings = createPitchSettingsStore(
      memoryStorage({
        [PITCH_SENSITIVITY_KEY]: 'low',
        [PITCH_SHOW_OTHER_OCTAVE_KEY]: 'true',
      }),
    );
    let notified = 0;

    settings.subscribe(() => {
      notified += 1;
    });
    await settle();

    assert.deepEqual(settings.get(), {
      sensitivity: 'low',
      showOtherOctave: true,
    });
    assert.ok(notified > 0);
  });

  it('remembers each value on the device', async () => {
    const storage = memoryStorage();
    const settings = createPitchSettingsStore(storage);

    settings.set({ sensitivity: 'high' });
    settings.set({ showOtherOctave: true });
    await settle();

    assert.equal(storage.values[PITCH_SENSITIVITY_KEY], 'high');
    assert.equal(storage.values[PITCH_SHOW_OTHER_OCTAVE_KEY], 'true');

    settings.set({ showOtherOctave: false });
    await settle();
    assert.equal(storage.values[PITCH_SHOW_OTHER_OCTAVE_KEY], 'false');
  });

  it('writes only the value that changed', async () => {
    const storage = memoryStorage();
    const settings = createPitchSettingsStore(storage);

    settings.set({ sensitivity: 'low' });
    await settle();

    assert.deepEqual(Object.keys(storage.values), [PITCH_SENSITIVITY_KEY]);
  });

  it('keeps the other-octave value while only sensitivity is changed', async () => {
    const settings = createPitchSettingsStore(
      memoryStorage({ [PITCH_SHOW_OTHER_OCTAVE_KEY]: 'true' }),
    );

    await settings.load();
    settings.set({ sensitivity: 'high' });

    assert.equal(settings.get().showOtherOctave, true);
    assert.equal(settings.get().sensitivity, 'high');
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
        [PITCH_SENSITIVITY_KEY]: 'low',
        [PITCH_SHOW_OTHER_OCTAVE_KEY]: 'true',
      }),
    );

    settings.subscribe(() => undefined);
    settings.set({ sensitivity: 'high' });
    await settle();

    assert.equal(settings.get().sensitivity, 'high');
    assert.equal(settings.get().showOtherOctave, true);
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
    settings.set({ sensitivity: 'low' });

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
    settings.set({ sensitivity: 'high' });
    await settle();

    assert.equal(settings.get().sensitivity, 'high');
  });
});
