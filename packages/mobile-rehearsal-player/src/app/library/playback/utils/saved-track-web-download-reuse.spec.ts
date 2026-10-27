/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSavedTrackDownloadProgressStore } from './saved-track-download-progress.js';
import { subscribeToSavedTrackDownloads } from './saved-track-download-events.js';
import { createSavedTrackAudioCache } from './saved-track-audio-cache.js';
import {
  abortSavedTrackDownloads,
  isSavedTrackDownloadAbortError,
  startSavedTrackDownload,
  type SavedTrackDownloadResponse,
} from './saved-track-web-download.js';

const TRACK_URL =
  'https://www.googleapis.com/drive/v3/files/drive-file-1?alt=media';

describe('reused saved track downloads', () => {
  // A fetch fake the test settles explicitly, counting requests.
  const createControlledFetch = () => {
    const state = {
      requests: 0,
      signals: [] as Array<AbortSignal | undefined>,
    };
    let finish: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });

    return {
      finish: () => finish(),
      requests: () => state.requests,
      signals: state.signals,
      fetch: async (
        _input: string,
        init?: { signal?: AbortSignal },
      ): Promise<SavedTrackDownloadResponse> => {
        state.requests += 1;
        state.signals.push(init?.signal);
        await gate;

        return { blob: async () => new Blob(['abcd']), ok: true, status: 200 };
      },
    };
  };

  it('serves a replay of the same file and version without another request', async () => {
    const cache = createSavedTrackAudioCache(100);
    const controlled = createControlledFetch();

    controlled.finish();
    const first = await startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache, version: 'v1' },
    );
    const second = await startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache, version: 'v1' },
    );

    assert.equal(second, first);
    assert.equal(controlled.requests(), 1);
  });

  it('downloads again when the version changes', async () => {
    const cache = createSavedTrackAudioCache(100);
    const controlled = createControlledFetch();

    controlled.finish();
    await startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache, version: 'v1' },
    );
    await startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache, version: 'v2' },
    );

    assert.equal(controlled.requests(), 2);
  });

  it('never reuses a download that has no version', async () => {
    const cache = createSavedTrackAudioCache(100);
    const controlled = createControlledFetch();

    controlled.finish();
    await startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache },
    );
    await startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache },
    );

    assert.equal(controlled.requests(), 2);
  });

  it('shares one request between concurrent callers of a file', async () => {
    const cache = createSavedTrackAudioCache(100);
    const controlled = createControlledFetch();
    const options = { cache, version: 'v1' };
    const first = startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      options,
    );
    const second = startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      options,
    );

    controlled.finish();

    assert.equal(await first, await second);
    assert.equal(controlled.requests(), 1);
  });

  it('keeps a shared download running when only the superseded waiter is released', async () => {
    const cache = createSavedTrackAudioCache(100);
    const controlled = createControlledFetch();
    const player = startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache, version: 'v1' },
    );
    const analysis = startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache, cancelOnReset: false, version: 'v1' },
    );

    abortSavedTrackDownloads();
    controlled.finish();

    await assert.rejects(player, isSavedTrackDownloadAbortError);
    assert.equal((await analysis).size, 4);
    assert.equal(controlled.signals[0]?.aborted, false);
  });

  it('aborts the request once the last waiter is released', async () => {
    const cache = createSavedTrackAudioCache(100);
    const controlled = createControlledFetch();
    const player = startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache, version: 'v1' },
    );

    // Let the download reach its fetch before releasing.
    await new Promise((resolve) => setImmediate(resolve));
    abortSavedTrackDownloads();
    controlled.finish();

    await assert.rejects(player, isSavedTrackDownloadAbortError);
    assert.equal(controlled.signals[0]?.aborted, true);
  });

  it('announces cached bytes again so waveform analysis still gets them', async () => {
    const cache = createSavedTrackAudioCache(100);
    const controlled = createControlledFetch();
    const sizes: number[] = [];
    const stop = subscribeToSavedTrackDownloads((event) => {
      sizes.push(event.blob.size);
    });

    controlled.finish();
    await startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache, version: 'v1' },
    );
    await startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache, version: 'v1' },
    );
    stop();

    assert.deepEqual(sizes, [4, 4]);
  });

  it('serves a file persisted by an earlier session without a request, then keeps it in memory', async () => {
    const persisted = new Blob(['persisted']);
    const cache = createSavedTrackAudioCache(100);
    const controlled = createControlledFetch();
    const persistence = {
      read: async () => persisted,
      write: async () => undefined,
    };

    const blob = await startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache, persistence, version: 'v1' },
    );

    assert.equal(blob, persisted);
    assert.equal(controlled.requests(), 0);
    assert.equal(cache.get('drive-file-1', 'v1'), persisted);
  });

  it('persists a finished download under its version without waiting on storage', async () => {
    const cache = createSavedTrackAudioCache(100);
    const controlled = createControlledFetch();
    const writes: Array<{ id: string; version: string; size: number }> = [];
    const persistence = {
      read: async () => null,
      // Never settles: the download must not wait for storage.
      write: (id: string, version: string, blob: Blob) => {
        writes.push({ id, size: blob.size, version });

        return new Promise<void>(() => undefined);
      },
    };

    controlled.finish();
    await startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache, persistence, version: 'v1' },
    );

    assert.deepEqual(writes, [{ id: 'drive-file-1', size: 4, version: 'v1' }]);
  });

  it('never persists a download that has no version', async () => {
    const cache = createSavedTrackAudioCache(100);
    const controlled = createControlledFetch();
    let touched = 0;
    const persistence = {
      read: async () => {
        touched += 1;
        return null;
      },
      write: async () => {
        touched += 1;
      },
    };

    controlled.finish();
    await startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache, persistence },
    );

    assert.equal(touched, 0);
  });

  it("shows a joined download in the joining caller's progress store and clears it after", async () => {
    const cache = createSavedTrackAudioCache(100);
    const controlled = createControlledFetch();
    const prefetchStore = createSavedTrackDownloadProgressStore();
    const playerStore = createSavedTrackDownloadProgressStore();
    const prefetch = startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch, store: prefetchStore },
      { cache, cancelOnReset: false, version: 'v1' },
    );

    // Let the prefetch's download start before the player joins it.
    await new Promise((resolve) => setImmediate(resolve));
    const player = startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch, store: playerStore },
      { cache, version: 'v1' },
    );

    assert.equal(playerStore.getSnapshot().status, 'downloading');

    controlled.finish();
    await Promise.all([prefetch, player]);

    assert.equal(playerStore.getSnapshot().status, 'idle');
    assert.equal(prefetchStore.getSnapshot().status, 'idle');
  });

  it("clears a released waiter's progress while the download continues for another", async () => {
    const cache = createSavedTrackAudioCache(100);
    const controlled = createControlledFetch();
    const playerStore = createSavedTrackDownloadProgressStore();
    const prefetch = startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch },
      { cache, cancelOnReset: false, version: 'v1' },
    );
    const player = startSavedTrackDownload(
      { url: TRACK_URL },
      { fetch: controlled.fetch, store: playerStore },
      { cache, version: 'v1' },
    );

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(playerStore.getSnapshot().status, 'downloading');

    abortSavedTrackDownloads();

    assert.equal(playerStore.getSnapshot().status, 'idle');
    controlled.finish();
    await assert.rejects(player, isSavedTrackDownloadAbortError);
    await prefetch;
  });
});
