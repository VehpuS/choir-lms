import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MicrophoneChoice } from './microphone-choice-model';
import {
  createMicrophoneInputResolver,
  type ResolveMicrophoneInputDeps,
} from './resolve-microphone-input';

const named = [
  { deviceId: 'a', kind: 'audioinput', label: 'iPhone Microphone' },
  { deviceId: 'b', kind: 'audioinput', label: 'Earbuds' },
];
const unnamed = named.map((device) => ({ ...device, label: '' }));

const setup = (options: {
  answer?: Awaited<ReturnType<ResolveMicrophoneInputDeps['ask']>>;
  choice?: MicrophoneChoice | null;
  devices?: typeof named;
  devicesAfterProbe?: typeof named;
}) => {
  const calls = { asked: 0, probed: 0, remembered: [] as MicrophoneChoice[] };
  let probed = false;
  const resolve = createMicrophoneInputResolver({
    ask: async () => {
      calls.asked += 1;
      return options.answer ?? { input: undefined, remember: false };
    },
    getChoice: async () => options.choice ?? null,
    listDevices: async () =>
      probed && options.devicesAfterProbe
        ? options.devicesAfterProbe
        : (options.devices ?? named),
    probe: async () => {
      calls.probed += 1;
      probed = true;
    },
    remember: async (choice) => {
      calls.remembered.push(choice);
    },
  });

  return { calls, resolve };
};

describe('resolving the microphone input', () => {
  it('asks when there is a choice and returns the picked input', async () => {
    const { calls, resolve } = setup({
      answer: {
        input: { deviceId: 'a', label: 'iPhone Microphone' },
        remember: false,
      },
    });

    assert.equal(await resolve(), 'a');
    assert.equal(calls.asked, 1);
    assert.equal(calls.remembered.length, 0);
  });

  it('remembers the answer only when asked to', async () => {
    const { calls, resolve } = setup({
      answer: { input: { deviceId: 'b', label: 'Earbuds' }, remember: true },
    });

    await resolve();

    assert.deepEqual(calls.remembered, [
      { kind: 'input', input: { deviceId: 'b', label: 'Earbuds' } },
    ]);
  });

  it('remembers Automatic when that was picked with remember on', async () => {
    const { calls, resolve } = setup({
      answer: { input: undefined, remember: true },
    });

    assert.equal(await resolve(), undefined);
    assert.deepEqual(calls.remembered, [{ kind: 'automatic' }]);
  });

  it('does not ask when a connected input is remembered', async () => {
    const { calls, resolve } = setup({
      choice: { kind: 'input', input: { deviceId: 'b', label: 'Earbuds' } },
    });

    assert.equal(await resolve(), 'b');
    assert.equal(calls.asked, 0);
  });

  it('uses the system choice for a remembered input that is gone', async () => {
    const { calls, resolve } = setup({
      choice: { kind: 'input', input: { deviceId: 'z', label: 'Gone' } },
    });

    assert.equal(await resolve(), undefined);
    assert.equal(calls.asked, 0);
  });

  it('opens a first-time input to learn the names, then asks', async () => {
    const { calls, resolve } = setup({
      devices: unnamed,
      devicesAfterProbe: named,
    });

    await resolve();

    assert.equal(calls.probed, 1);
    assert.equal(calls.asked, 1);
  });

  it('does not probe when Automatic is remembered', async () => {
    const { calls, resolve } = setup({
      choice: { kind: 'automatic' },
      devices: unnamed,
    });

    assert.equal(await resolve(), undefined);
    assert.equal(calls.probed, 0);
  });

  it('opens the system input once even when only a placeholder is listed', async () => {
    // Safari: one nameless input with no id until a microphone was opened.
    const placeholder = [{ deviceId: '', kind: 'audioinput', label: '' }];
    const { calls, resolve } = setup({
      devices: placeholder,
      devicesAfterProbe: named,
    });

    await resolve();

    assert.equal(calls.probed, 1);
    assert.equal(calls.asked, 1);
  });

  it('does not ask when the real list turns out to be one input', async () => {
    const placeholder = [{ deviceId: '', kind: 'audioinput', label: '' }];
    const { calls, resolve } = setup({
      devices: placeholder,
      devicesAfterProbe: named.slice(0, 1),
    });

    assert.equal(await resolve(), undefined);
    assert.equal(calls.probed, 1);
    assert.equal(calls.asked, 0);
  });

  it('asks for a remembered input by its stored id when names are hidden', async () => {
    const { calls, resolve } = setup({
      choice: { kind: 'input', input: { deviceId: 'b', label: 'Earbuds' } },
      devices: unnamed,
    });

    assert.equal(await resolve(), 'b');
    assert.equal(calls.probed, 0);
    assert.equal(calls.asked, 0);
  });
});
