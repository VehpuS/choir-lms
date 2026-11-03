import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ensureDriveFolder } from './drive-folder-ensure';

type Call = {
  url: string;
  method: string;
  body?: string;
  headers: Record<string, string>;
};

const reply = (status: number, body: unknown = {}) => ({
  json: async () => body,
  ok: status >= 200 && status < 300,
  status,
});

const run = (
  responses: Array<ReturnType<typeof reply> | Error>,
  options: { name?: string; parentId?: string } = {},
) => {
  const calls: Call[] = [];
  const queue = [...responses];

  return {
    calls,
    result: ensureDriveFolder({
      accessToken: 'token',
      fetch: async (url, init) => {
        calls.push({
          body: init.body,
          headers: init.headers,
          method: init.method,
          url,
        });
        const next = queue.shift();

        if (next instanceof Error) throw next;

        return next ?? reply(500);
      },
      name: options.name ?? 'Choir Recordings',
      parentId: options.parentId,
    }),
  };
};

describe('ensureDriveFolder', () => {
  it('uses the folder that is already there and creates nothing', async () => {
    const { calls, result } = run([
      reply(200, { files: [{ id: 'f1', name: 'Choir Recordings' }] }),
    ]);

    assert.deepEqual(await result, {
      created: false,
      folder: { id: 'f1', name: 'Choir Recordings' },
      status: 'ready',
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.method, 'GET');
    assert.equal(calls[0]?.headers.Authorization, 'Bearer token');
  });

  it('looks in My Drive by name and folder type, skipping trashed folders', async () => {
    const { calls, result } = run([
      reply(200, { files: [{ id: 'f1', name: 'x' }] }),
    ]);

    await result;
    const query = new URL(calls[0]?.url ?? '').searchParams.get('q');

    assert.equal(
      query,
      "name = 'Choir Recordings' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false",
    );
  });

  it('escapes a quote in the name', async () => {
    const { calls, result } = run(
      [reply(200, { files: [{ id: 'f', name: 'x' }] })],
      { name: "Moshe's takes" },
    );

    await result;
    assert.match(
      new URL(calls[0]?.url ?? '').searchParams.get('q') ?? '',
      /name = 'Moshe\\'s takes'/,
    );
  });

  it('creates the folder in the parent when none is found', async () => {
    const { calls, result } = run(
      [
        reply(200, { files: [] }),
        reply(200, { id: 'new-1', name: 'Choir Recordings' }),
      ],
      { parentId: 'parent-1' },
    );

    assert.deepEqual(await result, {
      created: true,
      folder: { id: 'new-1', name: 'Choir Recordings' },
      status: 'ready',
    });
    assert.equal(calls[1]?.method, 'POST');
    assert.deepEqual(JSON.parse(calls[1]?.body ?? '{}'), {
      mimeType: 'application/vnd.google-apps.folder',
      name: 'Choir Recordings',
      parents: ['parent-1'],
    });
  });

  it('maps failures to the shared reasons', async () => {
    assert.deepEqual(await run([reply(401)]).result, {
      reason: 'needs-write-access',
      status: 'failed',
    });
    assert.deepEqual(
      await run([
        reply(200, { files: [] }),
        reply(403, { error: { errors: [{ reason: 'storageQuotaExceeded' }] } }),
      ]).result,
      { reason: 'quota', status: 'failed' },
    );
    assert.deepEqual(await run([new TypeError('network')]).result, {
      reason: 'offline',
      status: 'failed',
    });
  });

  it('reports an unusable answer as unavailable', async () => {
    assert.deepEqual(
      await run([reply(200, { files: [] }), reply(200, { nope: true })]).result,
      {
        reason: 'unavailable',
        status: 'failed',
      },
    );
  });
});
