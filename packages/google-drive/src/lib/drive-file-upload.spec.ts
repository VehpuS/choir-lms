import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { uploadDriveFile } from './drive-file-upload';

type Call = { body: Uint8Array; headers: Record<string, string>; url: string };

const respond = (status: number, body: unknown = {}) => ({
  json: async () => body,
  ok: status >= 200 && status < 300,
  status,
});

const setUp = (
  handler: (signal?: AbortSignal) => Promise<ReturnType<typeof respond>>,
) => {
  const calls: Call[] = [];
  const fetch = async (
    url: string,
    init: {
      body: Uint8Array;
      headers: Record<string, string>;
      signal?: AbortSignal;
    },
  ) => {
    calls.push({ body: init.body, headers: init.headers, url });

    return handler(init.signal);
  };

  return {
    calls,
    upload: (overrides: Partial<Parameters<typeof uploadDriveFile>[0]> = {}) =>
      uploadDriveFile({
        accessToken: 'token',
        bytes: new TextEncoder().encode('%PDF-1.4 tiny'),
        fetch,
        folderId: 'folder-1',
        mimeType: 'application/pdf',
        name: 'Kyrie.pdf',
        ...overrides,
      }),
  };
};

const driveError = (status: number, reason: string) =>
  respond(status, { error: { errors: [{ reason }] } });

describe('uploadDriveFile', () => {
  it('sends the metadata and bytes in one authorized multipart request', async () => {
    const { calls, upload } = setUp(async () =>
      respond(200, {
        id: 'new-1',
        mimeType: 'application/pdf',
        name: 'Kyrie.pdf',
      }),
    );

    assert.deepEqual(await upload(), {
      file: { id: 'new-1', mimeType: 'application/pdf', name: 'Kyrie.pdf' },
      status: 'uploaded',
    });

    const [call] = calls;
    const text = new TextDecoder().decode(call?.body);

    assert.match(call?.url ?? '', /uploadType=multipart/);
    assert.equal(call?.headers.Authorization, 'Bearer token');
    assert.match(
      call?.headers['Content-Type'] ?? '',
      /^multipart\/related; boundary=/,
    );
    assert.ok(text.includes('"parents":["folder-1"]'));
    assert.ok(text.includes('"name":"Kyrie.pdf"'));
    assert.ok(text.includes('%PDF-1.4 tiny'));
  });

  it('reports a missing write scope for a 403 insufficientPermissions and for a 401', async () => {
    const forbidden = setUp(async () =>
      driveError(403, 'insufficientPermissions'),
    );
    const unauthorized = setUp(async () => respond(401));

    assert.deepEqual(await forbidden.upload(), {
      reason: 'needs-write-access',
      status: 'failed',
    });
    assert.deepEqual(await unauthorized.upload(), {
      reason: 'needs-write-access',
      status: 'failed',
    });
  });

  it('tells a full Drive from a folder the user may not write to', async () => {
    const full = setUp(async () => driveError(403, 'storageQuotaExceeded'));
    const readOnly = setUp(async () =>
      driveError(403, 'insufficientFilePermissions'),
    );
    const noBody = setUp(async () => respond(403));

    assert.deepEqual(await full.upload(), {
      reason: 'quota',
      status: 'failed',
    });
    assert.deepEqual(await readOnly.upload(), {
      reason: 'folder-not-writable',
      status: 'failed',
    });
    assert.deepEqual(await noBody.upload(), {
      reason: 'folder-not-writable',
      status: 'failed',
    });
  });

  it('reports a missing parent folder as not writable', async () => {
    const { upload } = setUp(async () => respond(404));

    assert.deepEqual(await upload(), {
      reason: 'folder-not-writable',
      status: 'failed',
    });
  });

  it('refuses a file over the limit without sending it', async () => {
    const { calls, upload } = setUp(async () => respond(200));

    assert.deepEqual(await upload({ maxBytes: 4 }), {
      reason: 'too-large',
      status: 'failed',
    });
    assert.equal(calls.length, 0);
  });

  it('reports a Drive 413 as too large and other statuses as unavailable', async () => {
    const large = setUp(async () => respond(413));
    const broken = setUp(async () => respond(503));

    assert.deepEqual(await large.upload(), {
      reason: 'too-large',
      status: 'failed',
    });
    assert.deepEqual(await broken.upload(), {
      reason: 'unavailable',
      status: 'failed',
    });
  });

  it('reports a network error as offline', async () => {
    const { upload } = setUp(async () => {
      throw new TypeError('Failed to fetch');
    });

    assert.deepEqual(await upload(), { reason: 'offline', status: 'failed' });
  });

  it('reports an abort as aborted, not as a failure', async () => {
    const controller = new AbortController();
    const { upload } = setUp(async (signal) => {
      controller.abort();
      assert.equal(signal, controller.signal);
      throw new DOMException('Aborted', 'AbortError');
    });

    assert.deepEqual(await upload({ signal: controller.signal }), {
      status: 'aborted',
    });
  });
});
