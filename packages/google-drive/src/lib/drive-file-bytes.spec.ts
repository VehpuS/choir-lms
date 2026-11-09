import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readDriveFileBytes } from './drive-file-bytes';

const reply = (status: number, bytes = new Uint8Array()) => ({
  ok: status >= 200 && status < 300,
  status,
  arrayBuffer: async () => bytes.buffer.slice(0) as ArrayBuffer,
  json: async () => ({}),
});

describe('readDriveFileBytes', () => {
  it('returns the content of a file', async () => {
    const result = await readDriveFileBytes({
      accessToken: 't',
      fileId: 'a b',
      fetch: async (url) => {
        assert.match(url, /files\/a%20b\?alt=media/);

        return reply(200, new Uint8Array([1, 2, 3]));
      },
    });

    assert.deepEqual(result, {
      status: 'ok',
      bytes: new Uint8Array([1, 2, 3]),
    });
  });

  it('reports a missing file, an offline device and an abort', async () => {
    assert.deepEqual(
      await readDriveFileBytes({
        accessToken: 't',
        fileId: 'x',
        fetch: async () => reply(404),
      }),
      { status: 'failed', reason: 'folder-not-writable' },
    );
    assert.deepEqual(
      await readDriveFileBytes({
        accessToken: 't',
        fileId: 'x',
        fetch: async () => {
          throw new TypeError('network');
        },
      }),
      { status: 'failed', reason: 'offline' },
    );

    const controller = new AbortController();

    controller.abort();

    assert.deepEqual(
      await readDriveFileBytes({
        accessToken: 't',
        fileId: 'x',
        signal: controller.signal,
        fetch: async () => {
          throw new Error('aborted');
        },
      }),
      { status: 'aborted' },
    );
  });
});
