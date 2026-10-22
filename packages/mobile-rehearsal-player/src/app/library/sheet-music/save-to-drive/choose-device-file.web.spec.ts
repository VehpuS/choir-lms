import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  chooseFileWithInput,
  type FileInput,
} from './choose-device-file.web.js';

// A stand-in for the browser's <input type="file">: the spec decides when the
// user picks or dismisses, which a real chooser leaves to a person.
const createFakeInput = (files: FileInput['files'] = null) => {
  const listeners: Record<string, () => void> = {};
  const input: FileInput = {
    accept: '',
    addEventListener: (type, listener) => {
      listeners[type] = listener;
    },
    click: () => undefined,
    files,
    type: '',
  };

  return { input, listeners };
};

describe('chooseFileWithInput', () => {
  it('offers only the supported types', async () => {
    const { input, listeners } = createFakeInput();
    const pending = chooseFileWithInput(input);

    listeners.cancel?.();
    await pending;

    assert.equal(input.type, 'file');
    assert.equal(input.accept, '.pdf,.xml,.musicxml,.mxl,.mid,.midi');
  });

  it('resolves with the picked file and reads its bytes on request', async () => {
    const { input, listeners } = createFakeInput([
      {
        arrayBuffer: async () =>
          new TextEncoder().encode('%PDF-').buffer as ArrayBuffer,
        name: 'Kyrie.pdf',
        size: 5,
        type: 'application/pdf',
      },
    ]);
    const pending = chooseFileWithInput(input);

    listeners.change?.();

    const choice = await pending;

    assert.equal(choice.status, 'chosen');

    if (choice.status === 'chosen') {
      assert.equal(choice.file.name, 'Kyrie.pdf');
      assert.equal(choice.file.size, 5);
      assert.equal(new TextDecoder().decode(await choice.file.read()), '%PDF-');
    }
  });

  it('resolves cancelled when the chooser is dismissed or returns no file', async () => {
    const dismissed = createFakeInput();
    const empty = createFakeInput([]);
    const first = chooseFileWithInput(dismissed.input);
    const second = chooseFileWithInput(empty.input);

    dismissed.listeners.cancel?.();
    empty.listeners.change?.();

    assert.deepEqual(await first, { status: 'cancelled' });
    assert.deepEqual(await second, { status: 'cancelled' });
  });
});
