import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SheetMusicSource } from '@org/audio-library-models';

import {
  createSheetMusicLoader,
  type SheetMusicLoaderDependencies,
} from './sheet-music-loader.js';

type FakeResponse = Awaited<ReturnType<SheetMusicLoaderDependencies['fetch']>>;
type FetchCall = Parameters<SheetMusicLoaderDependencies['fetch']>;

const bytesOf = (text: string) => Uint8Array.from(text, (c) => c.charCodeAt(0));

const respond = (
  body: string,
  options: { contentLength?: number; ok?: boolean; status?: number } = {},
): FakeResponse => ({
  arrayBuffer: async () => bytesOf(body).buffer as ArrayBuffer,
  headers: {
    get: (name) =>
      name === 'content-length' && options.contentLength !== undefined
        ? String(options.contentLength)
        : null,
  },
  ok: options.ok ?? true,
  status: options.status ?? 200,
});

const httpError = (status: number) => respond('', { ok: false, status });

const PDF_BODY = '%PDF-1.7 body';
const MUSICXML_BODY = '<score-partwise version="3.1"></score-partwise>';

const source = (
  location: SheetMusicSource['location'],
  format: SheetMusicSource['format'] = 'pdf',
): SheetMusicSource => ({
  id: 's1',
  label: 'Score',
  location,
  format,
  addedAt: '2026-01-01T00:00:00.000Z',
});

const DRIVE = source({ kind: 'drive', fileId: 'file-1', name: 'Score.pdf' });
const LINK = source({ kind: 'url', url: 'https://host.example/score.pdf' });

const setUp = (
  handler: (...call: FetchCall) => Promise<FakeResponse>,
  overrides: Partial<SheetMusicLoaderDependencies> = {},
) => {
  const calls: FetchCall[] = [];
  const loader = createSheetMusicLoader({
    checksCors: true,
    fetch: async (...call) => {
      calls.push(call);

      return handler(...call);
    },
    getDriveAccessToken: () => 'token-1',
    ...overrides,
  });

  return { calls, loader };
};

const neverSettles = (signal?: AbortSignal) =>
  new Promise<FakeResponse>((_, reject) => {
    signal?.addEventListener('abort', () =>
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
    );
  });

describe('createSheetMusicLoader', () => {
  it('loads a Drive file through the authorized media URL', async () => {
    const { calls, loader } = setUp(async () => respond(PDF_BODY));
    const result = await loader.load(DRIVE);

    assert.equal(result.status, 'loaded');
    assert.equal(
      calls[0]?.[0],
      'https://www.googleapis.com/drive/v3/files/file-1?alt=media&supportsAllDrives=true',
    );
    assert.deepEqual(calls[0]?.[1]?.headers, {
      Authorization: 'Bearer token-1',
    });
  });

  it('loads a link directly without credentials', async () => {
    const { calls, loader } = setUp(async () => respond(PDF_BODY));
    const result = await loader.load(LINK);

    assert.deepEqual(
      result.status === 'loaded' && [result.format, result.isCompressed],
      ['pdf', false],
    );
    assert.equal(calls[0]?.[1]?.headers, undefined);
  });

  it('flags a compressed MusicXML file', async () => {
    const { loader } = setUp(async () => respond('PK\u0003\u0004zip'));
    const result = await loader.load(
      source({ kind: 'url', url: 'https://host.example/a.mxl' }, 'musicxml'),
    );

    assert.equal(result.status === 'loaded' && result.isCompressed, true);
  });

  it('needs Drive access without a token, and does not call fetch', async () => {
    const { calls, loader } = setUp(async () => respond(PDF_BODY), {
      getDriveAccessToken: () => undefined,
    });

    assert.deepEqual(await loader.load(DRIVE), {
      reason: 'needs-drive-access',
      status: 'failed',
    });
    assert.equal(calls.length, 0);
  });

  it('maps HTTP failures for Drive files and links', async () => {
    const cases: Array<[SheetMusicSource, number, string]> = [
      [DRIVE, 401, 'needs-drive-access'],
      [DRIVE, 403, 'needs-drive-access'],
      [DRIVE, 404, 'not-found'],
      [DRIVE, 500, 'unavailable'],
      [LINK, 404, 'not-found'],
      [LINK, 410, 'not-found'],
      [LINK, 403, 'unavailable'],
      [LINK, 429, 'unavailable'],
    ];

    for (const [item, status, reason] of cases) {
      const { loader } = setUp(async () => httpError(status));

      assert.deepEqual(
        await loader.load(item),
        { reason, status: 'failed' },
        `${item.location.kind} ${status}`,
      );
    }
  });

  it('refuses a file over the size limit, declared or actual', async () => {
    const declared = setUp(
      async () => respond(PDF_BODY, { contentLength: 1000 }),
      { maxBytes: 100 },
    );
    const actual = setUp(async () => respond(PDF_BODY), { maxBytes: 5 });

    for (const { loader } of [declared, actual]) {
      assert.deepEqual(await loader.load(DRIVE), {
        reason: 'too-large',
        status: 'failed',
      });
    }
  });

  it('refuses bytes that are not what the link claims', async () => {
    const html = setUp(async () => respond('<html>Sign in</html>'));
    const notMusicXml = setUp(async () => respond('<rss version="2.0"/>'));

    assert.deepEqual(await html.loader.load(LINK), {
      reason: 'html-page',
      status: 'failed',
    });
    assert.deepEqual(
      await notMusicXml.loader.load(
        source({ kind: 'url', url: 'https://host.example/a.xml' }, 'musicxml'),
      ),
      { reason: 'not-musicxml', status: 'failed' },
    );
  });

  it('accepts a bare .xml that is MusicXML', async () => {
    const { loader } = setUp(async () => respond(MUSICXML_BODY));
    const result = await loader.load(
      source({ kind: 'url', url: 'https://host.example/a.xml' }, 'musicxml'),
    );

    assert.equal(result.status, 'loaded');
  });

  it('does not fetch a source that opens outside the app', async () => {
    const { calls, loader } = setUp(async () => respond(PDF_BODY));

    for (const format of ['musescore', 'link'] as const) {
      assert.deepEqual(
        await loader.load(
          source({ kind: 'url', url: 'https://musescore.com/s/1' }, format),
        ),
        { reason: 'unsupported', status: 'failed' },
      );
    }
    assert.equal(calls.length, 0);
  });

  it('reports no connection for a Drive file and no probe is needed', async () => {
    const { calls, loader } = setUp(async () => {
      throw new TypeError('Failed to fetch');
    });

    assert.deepEqual(await loader.load(DRIVE), {
      reason: 'offline',
      status: 'failed',
    });
    assert.equal(calls.length, 1);
  });

  it('tells a CORS-blocked link from an unreachable one on the web', async () => {
    const blocked = setUp(async (_, init) => {
      if (init?.mode === 'no-cors') {
        return respond('');
      }
      throw new TypeError('Failed to fetch');
    });
    const unreachable = setUp(async () => {
      throw new TypeError('Failed to fetch');
    });

    assert.deepEqual(await blocked.loader.load(LINK), {
      reason: 'blocked',
      status: 'failed',
    });
    assert.deepEqual(await unreachable.loader.load(LINK), {
      reason: 'offline',
      status: 'failed',
    });
    assert.equal(blocked.calls[1]?.[1]?.mode, 'no-cors');
  });

  it('does not probe where CORS does not apply', async () => {
    const { calls, loader } = setUp(
      async () => {
        throw new TypeError('Network request failed');
      },
      { checksCors: false },
    );

    assert.deepEqual(await loader.load(LINK), {
      reason: 'offline',
      status: 'failed',
    });
    assert.equal(calls.length, 1);
  });

  it('times out as unavailable', async () => {
    const { loader } = setUp(async (_, init) => neverSettles(init?.signal), {
      timeoutMs: 5,
    });

    assert.deepEqual(await loader.load(LINK), {
      reason: 'unavailable',
      status: 'failed',
    });
  });

  it('reports a caller cancel as aborted, before or during the request', async () => {
    const before = new AbortController();
    const during = new AbortController();
    const { loader } = setUp(async (_, init) => neverSettles(init?.signal));

    before.abort();
    assert.deepEqual(await loader.load(LINK, { signal: before.signal }), {
      reason: 'aborted',
      status: 'failed',
    });

    const pending = loader.load(LINK, { signal: during.signal });

    during.abort();
    assert.deepEqual(await pending, { reason: 'aborted', status: 'failed' });
  });

  it('turns an unexpected error into unavailable instead of throwing', async () => {
    const { loader } = setUp(async () => {
      throw new Error('boom');
    });

    assert.deepEqual(await loader.load(LINK), {
      reason: 'unavailable',
      status: 'failed',
    });
  });
});
