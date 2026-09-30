/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createSavedTrackDownloadProgressStore,
  type SavedTrackDownloadProgress,
} from './saved-track-download-progress.js';
import {
  SLOW_SAVED_TRACK_DOWNLOAD_MS,
  downloadSavedTrackBlob,
  isSavedTrackDownloadAbortError,
  type SavedTrackDownloadResponse,
} from './saved-track-web-download.js';

const TRACK_URL =
  'https://www.googleapis.com/drive/v3/files/drive-file-1?alt=media';

// A readable body fake: the test releases each chunk explicitly so progress
// can be observed between them.
const createStreamingResponse = (options: {
  chunks: number[];
  contentLength: string | null;
}) => {
  const pendingReads: Array<
    (result: { done: boolean; value?: Uint8Array }) => void
  > = [];
  let nextChunk = 0;

  const response: SavedTrackDownloadResponse = {
    async blob() {
      throw new Error('streaming responses are read through the body');
    },
    body: {
      getReader() {
        return {
          read() {
            return new Promise((resolve) => {
              pendingReads.push(resolve);
            });
          },
        };
      },
    },
    headers: {
      get(name: string) {
        return name === 'content-length' ? options.contentLength : null;
      },
    },
    ok: true,
    status: 200,
  };

  const releaseNextRead = async () => {
    while (pendingReads.length === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    const resolve = pendingReads.shift();
    const size = options.chunks[nextChunk];

    nextChunk += 1;
    resolve?.(
      size === undefined
        ? { done: true }
        : { done: false, value: new Uint8Array(size) },
    );
  };

  return { releaseNextRead, response };
};

// Timers are captured rather than scheduled so the slow threshold is fired
// by the test, not by wall-clock time.
const createHarness = (response: SavedTrackDownloadResponse) => {
  const store = createSavedTrackDownloadProgressStore();
  const published: SavedTrackDownloadProgress[] = [];
  const warnings: string[] = [];
  const timers: Array<() => void> = [];
  const clearedTimers: unknown[] = [];

  store.subscribe(() => {
    published.push(store.getSnapshot());
  });

  const dependencies = {
    clearTimer(handle: unknown) {
      clearedTimers.push(handle);
    },
    async fetch() {
      return response;
    },
    now() {
      return 1000;
    },
    setTimer(callback: () => void) {
      timers.push(callback);
      return timers.length;
    },
    store,
    warn(message: string) {
      warnings.push(message);
    },
  };

  return { clearedTimers, dependencies, published, store, timers, warnings };
};

describe('downloadSavedTrackBlob', () => {
  it('publishes received bytes against the content length, then clears progress', async () => {
    const stream = createStreamingResponse({
      chunks: [300, 700],
      contentLength: '1000',
    });
    const harness = createHarness(stream.response);
    const download = downloadSavedTrackBlob(
      { signal: new AbortController().signal, url: TRACK_URL },
      harness.dependencies,
    );

    await stream.releaseNextRead();
    await stream.releaseNextRead();
    await stream.releaseNextRead();

    const blob = await download;
    const receivedSteps = harness.published.flatMap((progress) => {
      return progress.status === 'downloading'
        ? [[progress.receivedBytes, progress.totalBytes]]
        : [];
    });

    assert.equal(blob.size, 1000);
    assert.deepEqual(receivedSteps.at(-1), [1000, 1000]);
    assert.ok(
      receivedSteps.some(([received]) => {
        return received === 300;
      }),
    );
    assert.deepEqual(harness.store.getSnapshot(), { status: 'idle' });
    assert.equal(harness.clearedTimers.length, 1);
  });

  it('reports an unknown total when the response has no content length', async () => {
    const stream = createStreamingResponse({
      chunks: [10],
      contentLength: null,
    });
    const harness = createHarness(stream.response);
    const download = downloadSavedTrackBlob(
      { signal: new AbortController().signal, url: TRACK_URL },
      harness.dependencies,
    );

    await stream.releaseNextRead();

    const snapshot = harness.store.getSnapshot();

    assert.equal(snapshot.status, 'downloading');
    assert.equal(
      snapshot.status === 'downloading' ? snapshot.totalBytes : undefined,
      null,
    );

    await stream.releaseNextRead();
    await download;
  });

  it('marks the download slow and warns once when the threshold passes', async () => {
    const stream = createStreamingResponse({
      chunks: [],
      contentLength: '5000',
    });
    const harness = createHarness(stream.response);
    const download = downloadSavedTrackBlob(
      { signal: new AbortController().signal, url: TRACK_URL },
      harness.dependencies,
    );

    assert.equal(harness.timers.length, 1);
    harness.timers[0]?.();

    const snapshot = harness.store.getSnapshot();

    assert.equal(snapshot.status === 'downloading' && snapshot.isSlow, true);
    assert.equal(harness.warnings.length, 1);
    assert.match(harness.warnings[0] ?? '', /drive-file-1/);
    assert.match(
      harness.warnings[0] ?? '',
      new RegExp(`${SLOW_SAVED_TRACK_DOWNLOAD_MS / 1000} s`),
    );

    await stream.releaseNextRead();
    await download;
  });

  it('rejects with an abort error and clears progress when aborted mid-download', async () => {
    const stream = createStreamingResponse({
      chunks: [100, 100],
      contentLength: '200',
    });
    const harness = createHarness(stream.response);
    const controller = new AbortController();
    const download = downloadSavedTrackBlob(
      { signal: controller.signal, url: TRACK_URL },
      harness.dependencies,
    );

    await stream.releaseNextRead();
    controller.abort();
    await stream.releaseNextRead();

    await assert.rejects(download, (error) => {
      return isSavedTrackDownloadAbortError(error);
    });
    assert.deepEqual(harness.store.getSnapshot(), { status: 'idle' });
  });

  it('leaves a newer download’s progress alone when an older one settles', async () => {
    const olderStream = createStreamingResponse({
      chunks: [],
      contentLength: '10',
    });
    const newerStream = createStreamingResponse({
      chunks: [5],
      contentLength: '10',
    });
    const olderHarness = createHarness(olderStream.response);
    const olderController = new AbortController();
    const olderDownload = downloadSavedTrackBlob(
      { signal: olderController.signal, url: TRACK_URL },
      olderHarness.dependencies,
    );
    const newerDownload = downloadSavedTrackBlob(
      { signal: new AbortController().signal, url: TRACK_URL },
      {
        ...olderHarness.dependencies,
        async fetch() {
          return newerStream.response;
        },
      },
    );

    await newerStream.releaseNextRead();
    olderController.abort();
    await olderStream.releaseNextRead();
    await assert.rejects(olderDownload);

    assert.equal(olderHarness.store.getSnapshot().status, 'downloading');

    await newerStream.releaseNextRead();
    await newerDownload;
  });
});
