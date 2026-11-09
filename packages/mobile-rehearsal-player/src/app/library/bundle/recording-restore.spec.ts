import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  LibraryBundleRecording,
  Recording,
} from '@org/audio-library-models';
import { encodeWavParts } from '@org/audio-mixing';

import { createFakeDependencies, SOPRANO, AT } from './bundle-test-support';
import {
  createRestoredRecordingId,
  toRestoredRecording,
} from './recording-restore-model';
import { restoreBundleRecordings } from './restore-bundle-recordings';
import { storeRestoredRecording } from './store-restored-recording';

const bundleRecording = (
  id: string,
  overrides: Partial<LibraryBundleRecording> = {},
): LibraryBundleRecording => ({
  id,
  name: 'Take 1',
  createdAt: AT,
  durationMs: 10_000,
  sampleRate: 44_100,
  sizeBytes: 8,
  appliedLatencyMs: 0,
  nudgeMs: 0,
  source: { driveFileId: 'd-sop', name: 'Soprano' },
  lineage: { trackId: 's1', loopId: 'l1' },
  shaping: { rate: 1, pitchSemitones: 0 },
  balance: 50,
  engineVersion: 1,
  markers: [],
  timeline: [],
  audio: { kind: 'drive', driveFileId: 'drive-rec', fileName: 'rec.wav' },
  ...overrides,
});

const idMaps = { sources: { s1: SOPRANO.id }, loops: { l1: 'loop-1' } };
const context = (extra = {}) => ({
  idMaps,
  sources: [SOPRANO],
  loops: [
    {
      id: 'loop-1',
      name: 'Entrance',
      sourceId: SOPRANO.id,
      sourceName: 'Soprano',
      startMs: 1000,
      endMs: 5000,
      ownerId: 'o',
      createdAt: AT,
      updatedAt: AT,
    },
  ],
  now: AT,
  ...extra,
});

const wavBytes = (samples: Int16Array) =>
  new Uint8Array(
    encodeWavParts([samples], { sampleRate: 44_100, channels: 1 }).flatMap(
      (part) => [...part],
    ),
  );

describe('toRestoredRecording', () => {
  it('attaches the recording to the tracks and loops the import created', () => {
    const restored = toRestoredRecording(
      bundleRecording('r1'),
      'recording:k:r1',
      context(),
    ) as Recording;

    assert.equal(restored.id, 'recording:k:r1');
    assert.deepEqual(restored.lineage.track, {
      id: SOPRANO.id,
      driveFileId: 'd-sop',
      name: 'Soprano',
    });
    assert.deepEqual(restored.lineage.loop, {
      id: 'loop-1',
      name: 'Entrance',
      startMs: 1000,
      endMs: 5000,
    });
    assert.equal('audio' in restored, false);
  });

  it('records the Drive copy so the export queue does not upload it again', () => {
    const restored = toRestoredRecording(
      bundleRecording('r1'),
      'recording:k:r1',
      context(),
    ) as Recording;

    assert.deepEqual(
      restored.exports?.done.map((d) => [d.kind, d.driveFileId]),
      [['recording', 'drive-rec']],
    );
  });

  it('leaves out one it cannot attach, or whose audio is not on Drive', () => {
    assert.equal(
      toRestoredRecording(
        bundleRecording('r1', { lineage: { trackId: 'gone' } }),
        'x',
        context(),
      ),
      null,
    );
    assert.equal(
      toRestoredRecording(
        bundleRecording('r1', { audio: { kind: 'not-uploaded' } }),
        'x',
        context(),
      ),
      null,
    );
    assert.equal(
      toRestoredRecording(bundleRecording('r1'), 'x', context({ loops: [] })),
      null,
    );
  });
});

describe('restoreBundleRecordings', () => {
  const bundle = (recordings: LibraryBundleRecording[]) =>
    ({ recordings }) as never;

  it('downloads, decodes and stores each recording', async () => {
    const { deps } = createFakeDependencies();
    const saved: Array<[string, number]> = [];

    deps.drive.downloadAudio = async () => ({
      status: 'ok',
      bytes: wavBytes(new Int16Array([1, 2, 3, 4])),
    });
    deps.library.saveRecording = async (recording, samples) => {
      saved.push([recording.id, samples.length]);
    };

    const outcome = await restoreBundleRecordings(deps, {
      bundle: bundle([bundleRecording('r1')]),
      idMaps,
      key: 'k',
    });

    assert.deepEqual(outcome, {
      restored: 1,
      alreadyHere: 0,
      failed: 0,
      cancelled: false,
    });
    assert.deepEqual(saved, [['recording:k:r1', 4]]);
  });

  it('counts failures without stopping and skips what a retry already restored', async () => {
    const { deps } = createFakeDependencies();

    deps.library.hasRecording = async (id) => id.endsWith(':r2');
    deps.drive.downloadAudio = async (fileId) =>
      fileId === 'bad'
        ? { status: 'failed', reason: 'offline' }
        : { status: 'ok', bytes: wavBytes(new Int16Array([1])) };

    const outcome = await restoreBundleRecordings(deps, {
      bundle: bundle([
        bundleRecording('r1', {
          audio: { kind: 'drive', driveFileId: 'bad', fileName: 'x' },
        }),
        bundleRecording('r2'),
        bundleRecording('r3'),
        bundleRecording('r4', {
          audio: { kind: 'drive', driveFileId: 'junk', fileName: 'x' },
        }),
      ]),
      idMaps,
      key: 'k',
    });

    assert.equal(outcome.restored, 2);
    assert.equal(outcome.alreadyHere, 1);
    assert.equal(outcome.failed, 1);
  });

  it('does nothing where recordings cannot be stored', async () => {
    const { deps } = createFakeDependencies();

    deps.library.recordingsSupported = () => false;

    assert.deepEqual(
      await restoreBundleRecordings(deps, {
        bundle: bundle([bundleRecording('r1')]),
        idMaps,
        key: 'k',
      }),
      { restored: 0, alreadyHere: 0, failed: 0, cancelled: false },
    );
  });

  it('stops when cancelled', async () => {
    const { deps } = createFakeDependencies();
    const controller = new AbortController();

    controller.abort();

    const outcome = await restoreBundleRecordings(deps, {
      bundle: bundle([bundleRecording('r1')]),
      idMaps,
      key: 'k',
      signal: controller.signal,
    });

    assert.equal(outcome.cancelled, true);
    assert.equal(outcome.restored, 0);
  });
});

describe('storeRestoredRecording', () => {
  const fakeStore = (failComplete = false) => {
    const log: string[] = [];

    return {
      log,
      store: {
        create: async () => void log.push('create'),
        appendChunk: async (_id: string, chunk: Int16Array) =>
          void log.push(`chunk:${chunk.length}`),
        complete: async () => {
          if (failComplete) throw new Error('disk');
          log.push('complete');
        },
        delete: async () => void log.push('delete'),
      },
    };
  };
  const recording = toRestoredRecording(
    bundleRecording('r1'),
    'recording:k:r1',
    context(),
  ) as Recording;

  it('writes in chunks and completes', async () => {
    const { log, store } = fakeStore();

    await storeRestoredRecording(store, recording, new Int16Array(70_000));

    assert.deepEqual(log, ['create', 'chunk:65536', 'chunk:4464', 'complete']);
  });

  it('removes a half-written take when it fails', async () => {
    const { log, store } = fakeStore(true);

    await assert.rejects(
      storeRestoredRecording(store, recording, new Int16Array(10)),
      /disk/,
    );
    assert.equal(log.at(-1), 'delete');
  });

  it('builds ids from the key and the bundle id', () => {
    assert.equal(createRestoredRecordingId('imp1', 'r2'), 'recording:imp1:r2');
  });
});
