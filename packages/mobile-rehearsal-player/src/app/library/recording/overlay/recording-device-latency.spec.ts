import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEVICE_LATENCY_STORAGE_KEY,
  getDeviceLatency,
  parseDeviceLatencies,
  saveDeviceLatency,
} from './recording-device-latency.js';
import { pickOutputDeviceKey } from './output-device-key.web.js';

const fakeStorage = (initial: Record<string, string> = {}) => {
  const data = { ...initial };

  return {
    data,
    getItem: async (key: string) => data[key] ?? null,
    setItem: async (key: string, value: string) => {
      data[key] = value;
    },
  };
};

describe('device latency store', () => {
  it('returns nothing for a device that was never saved', async () => {
    assert.equal(await getDeviceLatency('Speakers', fakeStorage()), null);
  });

  it('keeps one value per output and does not disturb the others', async () => {
    const storage = fakeStorage();

    await saveDeviceLatency('Speakers', 40, storage);
    await saveDeviceLatency('AirPods', 180, storage);
    await saveDeviceLatency('Speakers', 35, storage);

    assert.equal(await getDeviceLatency('Speakers', storage), 35);
    assert.equal(await getDeviceLatency('AirPods', storage), 180);
  });

  it('drops garbage and clamps values read from storage', () => {
    assert.deepEqual(parseDeviceLatencies('not json'), {});
    assert.deepEqual(parseDeviceLatencies('[1,2]'), {});
    assert.deepEqual(
      parseDeviceLatencies('{"a":5000,"b":-900,"c":"x","d":12.4}'),
      { a: 1000, b: -250, d: 12 },
    );
  });

  it('survives a storage that throws', async () => {
    const broken = {
      getItem: async () => {
        throw new Error('blocked');
      },
      setItem: async () => {
        throw new Error('blocked');
      },
    };

    assert.equal(await getDeviceLatency('Speakers', broken), null);
    await saveDeviceLatency('Speakers', 10, broken);
    assert.equal(typeof DEVICE_LATENCY_STORAGE_KEY, 'string');
  });
});

describe('output device key', () => {
  it('uses the label of the default output', () => {
    assert.equal(
      pickOutputDeviceKey([
        { kind: 'audioinput', deviceId: 'default', label: 'Mic' },
        { kind: 'audiooutput', deviceId: 'abc', label: 'HDMI' },
        {
          kind: 'audiooutput',
          deviceId: 'default',
          label: 'Default - AirPods',
        },
      ]),
      'Default - AirPods',
    );
  });

  it('shares one key when the browser gives no output label', () => {
    assert.equal(
      pickOutputDeviceKey([
        { kind: 'audiooutput', deviceId: 'default', label: '' },
      ]),
      'This browser',
    );
    assert.equal(pickOutputDeviceKey([]), 'This browser');
  });
});
