import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DeviceFile } from './device-file-chooser-types.js';
import {
  DEVICE_FILE_ACCEPT,
  DEVICE_FILE_REFUSAL_COPY,
  checkDeviceFile,
} from './device-file-model.js';

const textFile = (name: string, text: string, size?: number): DeviceFile => {
  const bytes = new TextEncoder().encode(text);

  return {
    mimeType: '',
    name,
    read: async () => bytes,
    size: size ?? bytes.length,
  };
};

describe('checkDeviceFile', () => {
  it('accepts a PDF, MusicXML, and MIDI file whose bytes match their names', async () => {
    const cases: Array<[string, string, string]> = [
      ['Kyrie.pdf', '%PDF-1.7 body', 'pdf'],
      [
        'Kyrie.xml',
        '<score-partwise><part-list/></score-partwise>',
        'musicxml',
      ],
      ['Kyrie.mid', 'MThd\0\0\0\u0006', 'midi'],
    ];

    for (const [name, text, format] of cases) {
      const result = await checkDeviceFile(textFile(name, text));

      assert.equal(result.status, 'accepted', name);
      assert.equal(result.status === 'accepted' && result.format, format);
    }
  });

  it('refuses a type the viewer cannot show, without reading the file', async () => {
    let reads = 0;

    for (const name of ['Kyrie.mscz', 'Kyrie.docx', 'Kyrie']) {
      const result = await checkDeviceFile({
        ...textFile(name, '%PDF-'),
        read: async () => {
          reads += 1;
          return new Uint8Array();
        },
      });

      assert.deepEqual(
        result,
        { reason: 'unsupported-type', status: 'refused' },
        name,
      );
    }
    assert.equal(reads, 0);
  });

  it('refuses a file over the limit before reading it', async () => {
    let reads = 0;
    const result = await checkDeviceFile(
      {
        ...textFile('Big.pdf', '%PDF-'),
        read: async () => {
          reads += 1;
          return new Uint8Array();
        },
        size: 11,
      },
      10,
    );

    assert.deepEqual(result, { reason: 'too-large', status: 'refused' });
    assert.equal(reads, 0);
  });

  it('refuses bytes that exceed the limit even when the declared size did not', async () => {
    const result = await checkDeviceFile(
      textFile('Odd.pdf', '%PDF-1.7 body', 1),
      5,
    );

    assert.deepEqual(result, { reason: 'too-large', status: 'refused' });
  });

  it('names what is wrong with a web page saved as a score', async () => {
    assert.deepEqual(
      await checkDeviceFile(
        textFile('Score.pdf', '<!doctype html><title>Sign in'),
      ),
      { reason: 'html-page', status: 'refused' },
    );
    assert.deepEqual(
      await checkDeviceFile(textFile('Score.xml', '<rss version="2.0"/>')),
      { reason: 'not-musicxml', status: 'refused' },
    );
    assert.deepEqual(await checkDeviceFile(textFile('Score.mid', 'RIFF')), {
      reason: 'wrong-format',
      status: 'refused',
    });
  });

  it('reports a file that cannot be read', async () => {
    const result = await checkDeviceFile({
      ...textFile('Score.pdf', ''),
      read: async () => {
        throw new Error('NotReadableError');
      },
    });

    assert.deepEqual(result, { reason: 'unreadable', status: 'refused' });
  });

  it('has copy for every refusal and offers the same types the check accepts', () => {
    for (const reason of Object.keys(DEVICE_FILE_REFUSAL_COPY)) {
      assert.ok(
        DEVICE_FILE_REFUSAL_COPY[
          reason as keyof typeof DEVICE_FILE_REFUSAL_COPY
        ].length > 0,
      );
    }
    assert.equal(DEVICE_FILE_ACCEPT, '.pdf,.xml,.musicxml,.mxl,.mid,.midi');
  });
});
