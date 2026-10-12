import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLrclibLyricsClient,
  stripLyricsTimestamps,
} from './lyrics-lookup-client.js';

const entry = (overrides: Record<string, unknown> = {}) => ({
  trackName: 'Mezmerize',
  artistName: 'System of a Down',
  duration: 237.4,
  plainLyrics: 'Line one\nLine two',
  syncedLyrics: '[00:01.00] Line one',
  ...overrides,
});

const respond = (
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
) => {
  const requests: string[] = [];
  const fetch = async (url: string) => {
    requests.push(url);
    return {
      ok: init.ok ?? true,
      status: init.status ?? 200,
      json: async () => body,
    };
  };

  return { client: createLrclibLyricsClient({ fetch }), requests };
};

describe('stripLyricsTimestamps', () => {
  it('removes timestamp markers and the space they leave behind', () => {
    assert.equal(
      stripLyricsTimestamps('[01:23.45] Hello  \n[02:00]World'),
      ' Hello\nWorld',
    );
  });
});

describe('createLrclibLyricsClient', () => {
  it('returns candidates with plain lyrics only and sends the query', async () => {
    const { client, requests } = respond([entry()]);
    const result = await client.search({
      title: 'Mezmerize',
      artist: 'System of a Down',
    });

    assert.deepEqual(result, {
      status: 'ok',
      candidates: [
        {
          title: 'Mezmerize',
          artist: 'System of a Down',
          durationMs: 237_400,
          plainLyrics: 'Line one\nLine two',
        },
      ],
    });
    assert.equal(
      requests[0],
      'https://lrclib.net/api/search?track_name=Mezmerize&artist_name=System+of+a+Down',
    );
  });

  it('ranks the closest track length first and skips entries without lyrics', async () => {
    const { client } = respond([
      entry({ trackName: 'Far', duration: 400 }),
      entry({ trackName: 'Empty', plainLyrics: null }),
      entry({ trackName: 'Near', duration: 238 }),
    ]);
    const result = await client.search({ title: 'x', durationMs: 237_000 });

    assert.equal(result.status, 'ok');
    assert.deepEqual(
      result.status === 'ok' && result.candidates.map(({ title }) => title),
      ['Near', 'Far'],
    );
  });

  it('strips timestamp markers found in plain lyrics', async () => {
    const { client } = respond([entry({ plainLyrics: '[00:10.00]Words' })]);
    const result = await client.search({ title: 'x' });

    assert.equal(
      result.status === 'ok' && result.candidates[0]?.plainLyrics,
      'Words',
    );
  });

  it('reports no results for an empty list or unusable entries', async () => {
    for (const body of [[], [entry({ plainLyrics: '' })], { error: 'x' }]) {
      const { client } = respond(body);

      assert.deepEqual(await client.search({ title: 'x' }), {
        status: 'failed',
        reason: 'no-results',
      });
    }
  });

  it('maps 429 to rate-limited and other HTTP errors to unavailable', async () => {
    assert.deepEqual(
      await respond({}, { ok: false, status: 429 }).client.search({
        title: 'x',
      }),
      { status: 'failed', reason: 'rate-limited' },
    );
    assert.deepEqual(
      await respond({}, { ok: false, status: 503 }).client.search({
        title: 'x',
      }),
      { status: 'failed', reason: 'unavailable' },
    );
  });

  it('maps a network failure to offline without throwing', async () => {
    const client = createLrclibLyricsClient({
      fetch: async () => {
        throw new TypeError('Network request failed');
      },
    });

    assert.deepEqual(await client.search({ title: 'x' }), {
      status: 'failed',
      reason: 'offline',
    });
  });

  it('maps malformed JSON to unavailable', async () => {
    const client = createLrclibLyricsClient({
      fetch: async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      }),
    });

    assert.deepEqual(await client.search({ title: 'x' }), {
      status: 'failed',
      reason: 'unavailable',
    });
  });

  it('reports aborted when the caller cancels', async () => {
    const controller = new AbortController();
    const client = createLrclibLyricsClient({
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    });
    const pending = client.search(
      { title: 'x' },
      { signal: controller.signal },
    );

    controller.abort();
    assert.deepEqual(await pending, { status: 'failed', reason: 'aborted' });
    assert.deepEqual(
      await client.search({ title: 'x' }, { signal: controller.signal }),
      { status: 'failed', reason: 'aborted' },
    );
  });

  it('times out as unavailable', async () => {
    const client = createLrclibLyricsClient({
      timeoutMs: 5,
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    });

    assert.deepEqual(await client.search({ title: 'x' }), {
      status: 'failed',
      reason: 'unavailable',
    });
  });
});
