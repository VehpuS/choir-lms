import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createPitchMonitorPreference,
  PITCH_MONITOR_OPEN_KEY,
} from './pitch-monitor-preference.js';

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

describe('pitch monitor preference', () => {
  it('starts closed with nothing stored', async () => {
    const preference = createPitchMonitorPreference(memoryStorage());

    preference.subscribe(() => undefined);
    await settle();

    assert.equal(preference.isOpen(), false);
  });

  it('restores an open monitor and tells subscribers', async () => {
    const preference = createPitchMonitorPreference(
      memoryStorage({ [PITCH_MONITOR_OPEN_KEY]: 'true' }),
    );
    let notified = 0;

    preference.subscribe(() => {
      notified += 1;
    });
    await settle();

    assert.equal(preference.isOpen(), true);
    assert.equal(notified, 1);
  });

  it('remembers the choice on the device', async () => {
    const storage = memoryStorage();
    const preference = createPitchMonitorPreference(storage);

    preference.setOpen(true);
    await settle();
    assert.equal(storage.values[PITCH_MONITOR_OPEN_KEY], 'true');

    preference.setOpen(false);
    await settle();
    assert.equal(storage.values[PITCH_MONITOR_OPEN_KEY], 'false');
  });

  it('lets a press made before the stored value arrived win over it', async () => {
    const preference = createPitchMonitorPreference(
      memoryStorage({ [PITCH_MONITOR_OPEN_KEY]: 'true' }),
    );

    preference.subscribe(() => undefined);
    preference.setOpen(false);
    await settle();

    assert.equal(preference.isOpen(), false);
  });

  it('stops notifying after unsubscribe', async () => {
    const preference = createPitchMonitorPreference(memoryStorage());
    let notified = 0;
    const unsubscribe = preference.subscribe(() => {
      notified += 1;
    });

    unsubscribe();
    preference.setOpen(true);

    assert.equal(notified, 0);
  });

  it('keeps working when storage fails', async () => {
    const preference = createPitchMonitorPreference({
      getItem: async () => {
        throw new Error('no storage');
      },
      setItem: async () => {
        throw new Error('no storage');
      },
    });

    preference.subscribe(() => undefined);
    preference.setOpen(true);
    await settle();

    assert.equal(preference.isOpen(), true);
  });
});
