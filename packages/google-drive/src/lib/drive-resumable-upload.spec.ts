import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bytesUploadSource,
  uploadDriveFileResumable,
  type ResumableFetch,
} from './drive-resumable-upload';

const CHUNK = 256 * 1024;
const SESSION = 'https://upload.example/session-1';

type Call = {
  body?: Uint8Array;
  headers: Record<string, string>;
  method: string;
  url: string;
};

const reply = (
  status: number,
  options: { body?: unknown; headers?: Record<string, string> } = {},
) => ({
  headers: { get: (name: string) => options.headers?.[name] ?? null },
  json: async () => options.body ?? {},
  ok: status >= 200 && status < 300,
  status,
});

const DONE = reply(200, {
  body: { id: 'f1', mimeType: 'audio/wav', name: 'take.wav' },
});

/** A fake Drive: holds the bytes it was sent and answers like the real endpoint. */
const fakeDrive = (
  options: {
    dropAfterChunks?: number;
    expireSession?: boolean;
    initialStored?: number;
  } = {},
) => {
  const calls: Call[] = [];
  let stored = options.initialStored ?? 0;
  let chunksSeen = 0;
  let total = 0;
  let expired = options.expireSession ?? false;

  const fetch: ResumableFetch = async (url, init) => {
    calls.push({
      body: init.body as Uint8Array | undefined,
      headers: init.headers,
      method: init.method,
      url,
    });

    const statedTotal = /\/(\d+)$/.exec(init.headers['Content-Range'] ?? '');

    if (statedTotal) total = Number(statedTotal[1]);

    if (init.method === 'POST') {
      total = Number(init.headers['X-Upload-Content-Length']);
      return reply(200, { headers: { Location: SESSION } });
    }

    if (expired) {
      expired = false;
      stored = 0;
      return reply(404);
    }

    const range = init.headers['Content-Range'];

    if (range.startsWith('bytes */')) {
      return stored >= total && total > 0
        ? DONE
        : reply(
            308,
            stored ? { headers: { Range: `bytes=0-${stored - 1}` } } : {},
          );
    }

    const [, from, to] = /bytes (\d+)-(\d+)\//.exec(range) ?? [];

    assert.equal(Number(from), stored, 'chunks arrive in order');
    chunksSeen += 1;

    if (
      options.dropAfterChunks !== undefined &&
      chunksSeen > options.dropAfterChunks
    ) {
      throw new TypeError('network down');
    }

    stored = Number(to) + 1;

    return stored >= total
      ? DONE
      : reply(308, { headers: { Range: `bytes=0-${stored - 1}` } });
  };

  return { calls, fetch, stored: () => stored };
};

const payload = (size: number) => new Uint8Array(size).map((_, i) => i % 251);

const upload = (
  drive: ReturnType<typeof fakeDrive>,
  size: number,
  overrides: Partial<Parameters<typeof uploadDriveFileResumable>[0]> = {},
) =>
  uploadDriveFileResumable({
    accessToken: 'token',
    chunkBytes: CHUNK,
    fetch: drive.fetch,
    folderId: 'folder-1',
    mimeType: 'audio/wav',
    name: 'take.wav',
    source: bytesUploadSource(payload(size)),
    ...overrides,
  });

describe('uploadDriveFileResumable', () => {
  it('starts a session with the metadata, then sends the file in ordered chunks with progress', async () => {
    const drive = fakeDrive();
    const progress: number[] = [];
    const sessions: string[] = [];
    const size = CHUNK * 2 + 100;

    const result = await upload(drive, size, {
      onProgress: (uploaded) => progress.push(uploaded),
      onSession: (uri) => sessions.push(uri),
    });

    assert.deepEqual(result, {
      file: { id: 'f1', mimeType: 'audio/wav', name: 'take.wav' },
      status: 'uploaded',
    });
    assert.deepEqual(sessions, [SESSION]);
    assert.deepEqual(progress, [0, CHUNK, CHUNK * 2, size]);
    assert.equal(
      drive.calls[0]?.headers['X-Upload-Content-Length'],
      String(size),
    );
    assert.match(drive.calls[0]?.url ?? '', /uploadType=resumable/);
    assert.match(String(drive.calls[0]?.body), /"parents":\["folder-1"\]/);
    assert.equal(drive.calls.filter((call) => call.method === 'PUT').length, 3);
  });

  it('returns the session when the connection drops, then resumes from the last stored chunk', async () => {
    const flaky = fakeDrive({ dropAfterChunks: 1 });
    const size = CHUNK * 3;

    const interrupted = await upload(flaky, size);

    assert.deepEqual(interrupted, {
      reason: 'offline',
      resumeUri: SESSION,
      status: 'failed',
    });
    assert.equal(flaky.stored(), CHUNK);

    const resumed = fakeDrive({ initialStored: CHUNK });
    const resumedCalls: string[] = [];
    const result = await upload(resumed, size, {
      fetch: async (url, init) => {
        resumedCalls.push(init.headers['Content-Range'] ?? init.method);
        return resumed.fetch(url, init);
      },
      resumeUri: SESSION,
    });

    assert.equal(result.status, 'uploaded');
    assert.equal(resumedCalls[0], `bytes */${size}`);
    assert.equal(resumedCalls[1], `bytes ${CHUNK}-${CHUNK * 2 - 1}/${size}`);
    assert.ok(!resumedCalls.some((call) => call.startsWith('bytes 0-')));
  });

  it('starts over once when the saved session has expired', async () => {
    const drive = fakeDrive({ expireSession: true });
    const sessions: string[] = [];

    const result = await upload(drive, CHUNK * 2, {
      onSession: (uri) => sessions.push(uri),
      resumeUri: 'https://upload.example/old',
    });

    assert.equal(result.status, 'uploaded');
    assert.equal(
      drive.calls.filter((call) => call.method === 'POST').length,
      1,
    );
    assert.deepEqual(sessions, [SESSION]);
  });

  it('reports the aborted state, keeping the session, when the signal aborts', async () => {
    const controller = new AbortController();
    const drive = fakeDrive();
    const result = await upload(drive, CHUNK * 3, {
      onProgress: (uploaded) => {
        if (uploaded >= CHUNK) controller.abort();
      },
      fetch: async (url, init) => {
        if (controller.signal.aborted) {
          throw Object.assign(new Error('aborted'), { name: 'AbortError' });
        }
        return drive.fetch(url, init);
      },
      signal: controller.signal,
    });

    assert.deepEqual(result, { resumeUri: SESSION, status: 'aborted' });
  });

  it('maps a refused session start to the shared failure reasons', async () => {
    const refuse =
      (status: number, reason?: string): ResumableFetch =>
      async () =>
        reply(status, { body: { error: { errors: [{ reason }] } } });
    const run = (fetch: ResumableFetch) =>
      uploadDriveFileResumable({
        accessToken: 'token',
        fetch,
        folderId: 'folder-1',
        name: 'take.wav',
        source: bytesUploadSource(payload(10)),
      });

    assert.deepEqual(await run(refuse(404)), {
      reason: 'folder-not-writable',
      status: 'failed',
    });
    assert.deepEqual(await run(refuse(401)), {
      reason: 'needs-write-access',
      status: 'failed',
    });
    assert.deepEqual(await run(refuse(403, 'storageQuotaExceeded')), {
      reason: 'quota',
      status: 'failed',
    });
  });

  it('keeps the session when Drive answers a chunk with a server error', async () => {
    const result = await uploadDriveFileResumable({
      accessToken: 'token',
      fetch: async (_url, init) =>
        init.method === 'POST'
          ? reply(200, { headers: { Location: SESSION } })
          : reply(503),
      folderId: 'folder-1',
      name: 'take.wav',
      source: bytesUploadSource(payload(10)),
    });

    assert.deepEqual(result, {
      reason: 'unavailable',
      resumeUri: SESSION,
      status: 'failed',
    });
  });

  it('uploads an empty file with a single empty chunk', async () => {
    const drive = fakeDrive();
    const calls: string[] = [];
    const result = await upload(drive, 0, {
      fetch: async (url, init) => {
        calls.push(init.headers['Content-Range'] ?? init.method);
        return init.method === 'POST' ? drive.fetch(url, init) : DONE;
      },
    });

    assert.equal(result.status, 'uploaded');
    assert.deepEqual(calls, ['POST', 'bytes */0']);
  });
});
