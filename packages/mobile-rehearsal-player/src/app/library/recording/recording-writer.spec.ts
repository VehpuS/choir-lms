import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PLAYBACK_SHAPING,
  type DriveAudioSource,
  type Recording,
} from '@org/audio-library-models';

import { createFakePcmSource, settle } from '../pitch/pitch-test-support.js';
import { createRecorder } from './recorder.js';
import { captureRecordingStart } from './recording-metadata.js';
import { createRecordingWriter } from './recording-writer.js';
import { createRecordingsStore } from './recordings-store.js';
import {
  createMemoryRecordingsBackend,
  readStoredSamples,
} from './recordings-test-support.js';

const RATE = 1000;
const track = {
  id: 'track-1',
  provider: 'google-drive',
  driveFileId: 'drive-1',
  name: 'Song.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 60_000,
  modifiedTime: 'v1',
  createdAt: 'x',
  availability: { status: 'available' },
} as DriveAudioSource;

const setup = () => {
  const memory = createMemoryRecordingsBackend();
  const store = createRecordingsStore(memory.backend);
  const source = createFakePcmSource('granted');
  const saved: Recording[] = [];
  const draft = captureRecordingStart({
    id: 'rec-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    playing: track,
    parent: track,
    shaping: DEFAULT_PLAYBACK_SHAPING,
    markers: [],
    existingNames: [],
    appliedLatencyMs: 0,
  });
  const writer = createRecordingWriter({
    store,
    draft,
    getTimeline: (elapsedMs) => [
      {
        recordingStartMs: 0,
        recordingEndMs: elapsedMs,
        trackStartMs: 10_000,
        held: false,
      },
    ],
    onSaved: (recording) => saved.push(recording),
  });
  const recorder = createRecorder({
    source,
    writer,
    estimate: async () => ({ quota: 100e9, usage: 0 }),
    chunkMs: 1000,
    retryDelaysMs: [],
    sleep: async () => undefined,
  });
  const feed = (count: number) => {
    for (let i = 0; i < count; i += 1) {
      source.emitBlock({
        samples: new Float32Array(100).fill(0.25),
        sampleRate: RATE,
        startTimeSec: 1 + (i * 100) / RATE,
      });
    }
  };

  return { ...memory, store, recorder, feed, saved };
};

describe('recorder to store', () => {
  it('stores a finished recording with its metadata, timeline, and decodable audio', async () => {
    const t = setup();

    await t.recorder.start();
    t.feed(25);
    const result = await t.recorder.stop();
    const stored = await t.store.get('rec-1');

    assert.equal(result.status, 'saved');
    assert.equal(stored?.durationMs, 2500);
    assert.equal(stored?.sizeBytes, 5000);
    assert.equal(stored?.name, 'Recording 1');
    assert.deepEqual(stored?.timeline, [
      {
        recordingStartMs: 0,
        recordingEndMs: 2500,
        trackStartMs: 10_000,
        held: false,
      },
    ]);
    assert.equal(t.saved.length, 1);

    assert.equal((await readStoredSamples(t.store, 'rec-1')).length, 2500);
  });

  it('keeps a recording that was stopped by a storage failure and can still export what was saved', async () => {
    const t = setup();

    await t.recorder.start();
    t.feed(10); // first full chunk
    await settle();
    t.failNextAppends(10);
    t.feed(15);
    await settle();
    const result = await t.recorder.stop();
    const stored = await t.store.get('rec-1');

    assert.equal(result.status === 'saved' && result.reason, 'storage-failed');
    assert.equal(stored?.durationMs, 1000);

    assert.equal((await readStoredSamples(t.store, 'rec-1')).length, 1000);
  });

  it('removes a recording that was too short to keep', async () => {
    const t = setup();

    await t.recorder.start();
    t.feed(3);
    const result = await t.recorder.stop();

    assert.equal(result.status, 'discarded');
    assert.deepEqual(t.recordIds(), []);
  });
});
