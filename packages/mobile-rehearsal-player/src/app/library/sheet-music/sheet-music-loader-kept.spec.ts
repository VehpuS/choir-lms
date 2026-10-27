import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SheetMusicSource } from '@org/audio-library-models';

import {
  createSheetMusicLoader,
  type SheetMusicLoaderDependencies,
} from './sheet-music-loader.js';

type FetchCall = Parameters<SheetMusicLoaderDependencies['fetch']>;
type FakeResponse = Awaited<ReturnType<SheetMusicLoaderDependencies['fetch']>>;

const bytesOf = (text: string) => Uint8Array.from(text, (c) => c.charCodeAt(0));
const PDF_BODY = '%PDF-1.7 body';

const respond = (body: string, status = 200): FakeResponse => ({
  arrayBuffer: async () => bytesOf(body).buffer as ArrayBuffer,
  headers: { get: () => null },
  ok: status === 200,
  status,
});

const source = (location: SheetMusicSource['location']): SheetMusicSource => ({
  addedAt: '2026-01-01T00:00:00.000Z',
  format: 'pdf',
  id: 's1',
  label: 'Score',
  location,
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

describe('createSheetMusicLoader kept copies', () => {
  const stored = bytesOf(PDF_BODY);

  it('uses the kept copy without a session', async () => {
    const { calls, loader } = setUp(async () => respond(PDF_BODY), {
      getDriveAccessToken: () => undefined,
      readStoredScore: async (fileId) => (fileId === 'file-1' ? stored : null),
    });
    const result = await loader.load(DRIVE);

    assert.equal(result.status, 'loaded');
    assert.equal(calls.length, 0);
  });

  it('uses the kept copy while the device is offline, even signed in', async () => {
    const { calls, loader } = setUp(async () => respond(PDF_BODY), {
      isOffline: () => true,
      readStoredScore: async () => stored,
    });

    assert.equal((await loader.load(DRIVE)).status, 'loaded');
    assert.equal(calls.length, 0);
  });

  it('fetches when online and signed in, so an edited score is current', async () => {
    const { calls, loader } = setUp(async () => respond(PDF_BODY), {
      readStoredScore: async () => stored,
    });

    await loader.load(DRIVE);
    assert.equal(calls.length, 1);
  });

  it('hands a freshly downloaded Drive score to the refresher, never a failed one', async () => {
    const loaded: string[] = [];
    const { loader } = setUp(async () => respond(PDF_BODY), {
      onDriveScoreLoaded: (fileId) => {
        loaded.push(fileId);
      },
    });
    const failing = setUp(async () => respond(PDF_BODY, 500), {
      onDriveScoreLoaded: (fileId) => {
        loaded.push(`failed:${fileId}`);
      },
    });

    await loader.load(DRIVE);
    await failing.loader.load(DRIVE);

    assert.deepEqual(loaded, ['file-1']);
  });

  it('falls back to the kept copy when the request cannot complete', async () => {
    const { loader } = setUp(
      async () => {
        throw new TypeError('Failed to fetch');
      },
      { readStoredScore: async () => stored },
    );

    assert.equal((await loader.load(DRIVE)).status, 'loaded');
  });

  it('asks for Drive access when nothing is kept and there is no session', async () => {
    const { loader } = setUp(async () => respond(PDF_BODY), {
      getDriveAccessToken: () => undefined,
      readStoredScore: async () => null,
    });

    assert.deepEqual(await loader.load(DRIVE), {
      reason: 'needs-drive-access',
      status: 'failed',
    });
  });

  it('never reads a kept copy for a linked page', async () => {
    let reads = 0;
    const { loader } = setUp(
      async () => {
        throw new TypeError('Failed to fetch');
      },
      {
        isOffline: () => true,
        readStoredScore: async () => {
          reads += 1;

          return stored;
        },
      },
    );
    const result = await loader.load(LINK);

    assert.equal(result.status, 'failed');
    assert.equal(reads, 0);
  });
});
