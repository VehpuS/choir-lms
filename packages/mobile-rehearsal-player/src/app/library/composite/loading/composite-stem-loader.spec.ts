import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PcmWindowReader } from '@org/audio-mixing';

import {
  getOverallLoadFraction,
  loadCompositeStems,
  type LoadStem,
  type StemLoadProgress,
} from './composite-stem-loader.js';
import { isSavedTrackDownloadAbortError } from '../../playback/utils/saved-track-blob-download';

const readerOf = (durationMs: number): PcmWindowReader => ({
  sampleRate: 1000,
  sampleCount: durationMs,
  durationMs,
  read: async () => new Float32Array(0),
});

/** A loader the test finishes by hand, so ordering and aborts are deterministic. */
const createManualLoader = () => {
  const pending = new Map<
    string,
    {
      resolve: (reader: PcmWindowReader) => void;
      reject: (error: unknown) => void;
      progress: (fraction: number) => void;
      signal: AbortSignal;
    }
  >();
  const loadStem: LoadStem = ({ stemId, signal, onProgress }) =>
    new Promise((resolve, reject) => {
      pending.set(stemId, { resolve, reject, progress: onProgress, signal });
      signal.addEventListener('abort', () =>
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
      );
    });

  return { loadStem, pending };
};

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('loadCompositeStems', () => {
  it('loads every stem and returns the readers', async () => {
    const result = await loadCompositeStems({
      stemIds: ['a', 'b', 'c'],
      loadStem: async ({ stemId }) => readerOf(stemId.charCodeAt(0)),
    });

    assert.deepEqual([...result.readers.keys()], ['a', 'b', 'c']);
    assert.deepEqual(result.failed, []);
  });

  it('reports per-stem progress in stem order', async () => {
    const manual = createManualLoader();
    const snapshots: StemLoadProgress[][] = [];
    const done = loadCompositeStems({
      stemIds: ['a', 'b'],
      loadStem: manual.loadStem,
      concurrency: 1,
      onProgress: (snapshot) => snapshots.push([...snapshot]),
    });

    await tick();
    manual.pending.get('a')?.progress(0.5);
    manual.pending.get('a')?.resolve(readerOf(1000));
    await tick();
    manual.pending.get('b')?.resolve(readerOf(1000));
    await done;

    const statuses = (index: number) =>
      snapshots[index].map(
        (entry) => `${entry.stemId}:${entry.status}:${entry.fraction}`,
      );

    assert.deepEqual(statuses(0), ['a:loading:0', 'b:waiting:0']);
    assert.deepEqual(statuses(1), ['a:loading:0.5', 'b:waiting:0']);
    assert.deepEqual(statuses(2), ['a:ready:1', 'b:waiting:0']);
    assert.equal(getOverallLoadFraction(snapshots[2]), 0.5);
    assert.equal(getOverallLoadFraction(snapshots.at(-1) ?? []), 1);
  });

  it('flags a stem that fails and still loads the rest', async () => {
    const boom = new Error('not available offline');
    const result = await loadCompositeStems({
      stemIds: ['a', 'b', 'c'],
      loadStem: async ({ stemId }) => {
        if (stemId === 'b') {
          throw boom;
        }

        return readerOf(1000);
      },
    });

    assert.deepEqual([...result.readers.keys()], ['a', 'c']);
    assert.deepEqual(result.failed, [{ stemId: 'b', error: boom }]);
  });

  it('returns every stem as failed when none loads', async () => {
    const result = await loadCompositeStems({
      stemIds: ['a', 'b'],
      loadStem: async () => {
        throw new Error('offline');
      },
    });

    assert.equal(result.readers.size, 0);
    assert.equal(result.failed.length, 2);
  });

  it('limits how many stems load at once', async () => {
    const manual = createManualLoader();
    const done = loadCompositeStems({
      stemIds: ['a', 'b', 'c', 'd'],
      loadStem: manual.loadStem,
      concurrency: 2,
    });

    await tick();
    assert.deepEqual([...manual.pending.keys()], ['a', 'b']);

    manual.pending.get('a')?.resolve(readerOf(1));
    await tick();
    assert.deepEqual([...manual.pending.keys()], ['a', 'b', 'c']);

    for (const id of ['b', 'c']) {
      manual.pending.get(id)?.resolve(readerOf(1));
      await tick();
    }

    manual.pending.get('d')?.resolve(readerOf(1));
    assert.equal((await done).readers.size, 4);
  });
});

describe('loadCompositeStems when superseded', () => {
  it('aborts stems in flight, stops reporting, and rejects with the shared abort error', async () => {
    const manual = createManualLoader();
    const controller = new AbortController();
    const snapshots: number[] = [];
    const done = loadCompositeStems({
      stemIds: ['a', 'b', 'c'],
      loadStem: manual.loadStem,
      signal: controller.signal,
      onProgress: () => snapshots.push(1),
    });

    await tick();
    const reportedBefore = snapshots.length;
    controller.abort();

    await assert.rejects(done, (error) =>
      isSavedTrackDownloadAbortError(error),
    );
    assert.equal(manual.pending.get('a')?.signal.aborted, true);
    assert.equal(snapshots.length, reportedBefore);
    // The queued third stem never started.
    assert.equal(manual.pending.has('c'), false);
  });

  it('does not start when already aborted', async () => {
    const controller = new AbortController();
    let started = 0;

    controller.abort();

    await assert.rejects(
      loadCompositeStems({
        stemIds: ['a'],
        signal: controller.signal,
        loadStem: async () => {
          started += 1;

          return readerOf(1);
        },
      }),
      (error) => isSavedTrackDownloadAbortError(error),
    );
    assert.equal(started, 0);
  });

  it('treats an abort raised by a stem as superseded, not as a failed stem', async () => {
    const abortError = Object.assign(new Error('superseded'), {
      name: 'AbortError',
    });

    await assert.rejects(
      loadCompositeStems({
        stemIds: ['a', 'b'],
        loadStem: async ({ stemId }) => {
          if (stemId === 'a') {
            throw abortError;
          }

          return readerOf(1);
        },
        concurrency: 1,
      }),
      (error) => isSavedTrackDownloadAbortError(error),
    );
  });
});
