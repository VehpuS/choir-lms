import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  decideInput,
  hasInputNames,
  listInputOptions,
  parseMicrophoneChoice,
  serializeMicrophoneChoice,
  toMicrophoneInputs,
  type MicrophoneChoice,
  type MicrophoneInput,
} from './microphone-choice-model';

const builtIn: MicrophoneInput = { deviceId: 'a', label: 'iPhone Microphone' };
const earbuds: MicrophoneInput = { deviceId: 'b', label: 'Earbuds' };
const devices = [
  { deviceId: 'default', kind: 'audioinput', label: 'Default - Earbuds' },
  { deviceId: 'a', kind: 'audioinput', label: 'iPhone Microphone' },
  { deviceId: 'b', kind: 'audioinput', label: 'Earbuds' },
  { deviceId: 'b', kind: 'audioinput', label: 'Earbuds' },
  { deviceId: 'c', kind: 'audiooutput', label: 'Speaker' },
];

describe('microphone inputs', () => {
  it('lists real audio inputs once, without aliases or outputs', () => {
    assert.deepEqual(toMicrophoneInputs(devices), [builtIn, earbuds]);
  });

  it('names unnamed inputs by position until a microphone is allowed', () => {
    const unnamed = [
      { deviceId: 'a', kind: 'audioinput', label: '' },
      { deviceId: 'b', kind: 'audioinput', label: '' },
    ];

    assert.equal(hasInputNames(unnamed), false);
    assert.equal(hasInputNames(devices), true);
    assert.deepEqual(
      toMicrophoneInputs(unnamed).map((input) => input.label),
      ['Microphone 1', 'Microphone 2'],
    );
  });
});

describe('deciding the input', () => {
  const inputs = [builtIn, earbuds];

  it('asks when there is a choice to make and none is remembered', () => {
    assert.deepEqual(decideInput(null, inputs), { action: 'ask' });
  });

  it('does not ask when there is one input or none', () => {
    assert.deepEqual(decideInput(null, [builtIn]), {
      action: 'use',
      deviceId: undefined,
    });
    assert.deepEqual(decideInput(null, []), {
      action: 'use',
      deviceId: undefined,
    });
  });

  it('uses the remembered input when it is connected', () => {
    assert.deepEqual(decideInput({ kind: 'input', input: earbuds }, inputs), {
      action: 'use',
      deviceId: 'b',
    });
  });

  it('falls back to the system choice when it is not connected', () => {
    assert.deepEqual(
      decideInput({ kind: 'input', input: earbuds }, [builtIn]),
      {
        action: 'use',
        deviceId: undefined,
      },
    );
  });

  it('leaves it to the system when Automatic is remembered', () => {
    assert.deepEqual(decideInput({ kind: 'automatic' }, inputs), {
      action: 'use',
      deviceId: undefined,
    });
  });
});

describe('settings options', () => {
  it('keeps a remembered input that is not connected, marked as such', () => {
    const options = listInputOptions({ kind: 'input', input: earbuds }, [
      builtIn,
    ]);

    assert.deepEqual(
      options.map((option) => [option.deviceId, option.connected]),
      [
        ['a', true],
        ['b', false],
      ],
    );
  });
});

describe('stored choice', () => {
  const choices: Array<MicrophoneChoice | null> = [
    null,
    { kind: 'automatic' },
    { kind: 'input', input: earbuds },
  ];

  it('round-trips each kind of choice', () => {
    choices.forEach((choice) => {
      assert.deepEqual(
        parseMicrophoneChoice(serializeMicrophoneChoice(choice)),
        choice,
      );
    });
  });

  it('ignores anything it does not recognise', () => {
    assert.equal(parseMicrophoneChoice('{"deviceId":""}'), null);
    assert.equal(parseMicrophoneChoice('nonsense'), null);
    assert.equal(parseMicrophoneChoice(null), null);
  });
});
