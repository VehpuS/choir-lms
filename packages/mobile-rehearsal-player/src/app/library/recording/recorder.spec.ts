import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PcmBlock } from '../pitch/pcm-source-types.js';
import {
  createFakePcmSource,
  createFakeVisibility,
  settle,
} from '../pitch/pitch-test-support.js';
import { createRecorder } from './recorder.js';
import type { RecordingChunkWriter } from './recorder-types.js';
import { RECORDING_STORAGE_RESERVE_BYTES } from './recording-storage-limit.js';

const SAMPLE_RATE = 1000;
const BLOCK = 100;
/** A tiny chunk (one second at the test rate) so specs stay small. */
const CHUNK_MS = 1000;
const ROOMY = { quota: 100e9, usage: 0 };

const block = (index: number, value = 0.5): PcmBlock => ({
  samples: new Float32Array(BLOCK).fill(value),
  sampleRate: SAMPLE_RATE,
  startTimeSec: 5 + (index * BLOCK) / SAMPLE_RATE,
});

const createFakeWriter = (options: { failAppendAt?: number } = {}) => {
  const log: string[] = [];
  const chunks: Int16Array[] = [];
  let appends = 0;
  const writer: RecordingChunkWriter = {
    begin: async ({ sampleRate }) => {
      log.push(`begin ${sampleRate}`);
    },
    append: async (chunk) => {
      appends += 1;

      if (appends === options.failAppendAt) {
        throw new Error('quota');
      }

      chunks.push(chunk);
    },
    finalize: async ({ sampleCount }) => {
      log.push(`finalize ${sampleCount}`);
    },
    discard: async () => {
      log.push('discard');
    },
  };

  return { writer, log, chunks };
};

const setup = (
  options: {
    estimate?: () => Promise<{ quota?: number; usage?: number } | null>;
    failAppendAt?: number;
  } = {},
) => {
  const source = createFakePcmSource('granted');
  const visibility = createFakeVisibility();
  const fake = createFakeWriter({ failAppendAt: options.failAppendAt });
  const recorder = createRecorder({
    source,
    writer: fake.writer,
    visibility,
    estimate: options.estimate ?? (async () => ROOMY),
    chunkMs: CHUNK_MS,
  });
  const feed = (count: number, from = 0) => {
    for (let i = 0; i < count; i += 1) {
      source.emitBlock(block(from + i));
    }
  };

  return { source, visibility, recorder, feed, ...fake };
};

describe('createRecorder', () => {
  it('writes full chunks as it records and the partial tail on stop', async () => {
    const t = setup();

    assert.deepEqual(await t.recorder.start(), { ok: true });
    t.feed(25); // 2.5 s
    const result = await t.recorder.stop();

    assert.deepEqual(
      t.chunks.map((c) => c.length),
      [1000, 1000, 500],
    );
    assert.equal(t.chunks[0]?.[0], 16384);
    assert.deepEqual(t.log, ['begin 1000', 'finalize 2500']);
    assert.deepEqual(result, {
      status: 'saved',
      reason: 'user',
      durationMs: 2500,
      sampleRate: SAMPLE_RATE,
      sampleCount: 2500,
      sizeBytes: 5000,
      captureStartSec: 5,
    });
  });

  it('discards a recording shorter than one second', async () => {
    const t = setup();

    await t.recorder.start();
    t.feed(5);
    const result = await t.recorder.stop();

    assert.equal(result.status, 'discarded');
    assert.deepEqual(t.log, ['begin 1000', 'discard']);
  });

  it('keeps what was captured on every stop reason it can see', async () => {
    const cases: Array<[string, (t: ReturnType<typeof setup>) => void]> = [
      ['hidden', (t) => t.visibility.set(false)],
      ['interrupted', (t) => t.source.interrupt()],
      ['microphone-ended', (t) => t.source.end()],
    ];

    for (const [reason, trigger] of cases) {
      const t = setup();

      await t.recorder.start();
      t.feed(15);
      trigger(t);
      const result = await t.recorder.stop('user');

      assert.equal(result.reason, reason);
      assert.equal(result.status, 'saved');
      assert.equal(result.durationMs, 1500, reason);
    }
  });

  it('stops with storage-failed on a failed write and keeps the chunks already written', async () => {
    const t = setup({ failAppendAt: 2 });

    await t.recorder.start();
    t.feed(25);
    await settle();
    const result = await t.recorder.stop();

    assert.equal(result.reason, 'storage-failed');
    assert.equal(result.status, 'saved');
    assert.equal(result.durationMs, 1000);
    assert.equal(t.chunks.length, 1);
  });

  it('stops with storage-full when the estimate runs out during a recording', async () => {
    let usage = 0;
    const t = setup({
      estimate: async () => ({ quota: 100e6, usage: (usage += 10e6) }),
    });

    await t.recorder.start();

    // One second of audio at a time, as real time would deliver it.
    for (let second = 0; second < 10; second += 1) {
      t.feed(10, second * 10);
      await settle();
    }

    const result = await t.recorder.stop();

    assert.equal(result.reason, 'storage-full');
    assert.ok(result.durationMs < 10_000);
  });

  it('refuses to start with under a minute of storage and does not open the microphone', async () => {
    const quota = 1e9;
    const usage = quota - RECORDING_STORAGE_RESERVE_BYTES - 96_000 * 30;
    const t = setup({ estimate: async () => ({ quota, usage }) });
    const result = await t.recorder.start();

    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.reason, 'storage-low');
    assert.equal(t.source.subscribeCalls(), 0);
  });

  it('records without a limit when the browser gives no estimate', async () => {
    const t = setup({ estimate: async () => null });

    assert.deepEqual(await t.recorder.start(), { ok: true });
  });

  it('reports why the microphone could not be opened', async () => {
    const t = setup();

    t.source.failNext('denied');

    const result = await t.recorder.start();

    assert.equal(!result.ok && result.reason, 'denied');
    assert.equal(t.recorder.isRecording(), false);
  });

  it('stops once and returns the same result to later stops', async () => {
    const t = setup();

    await t.recorder.start();
    t.feed(15);
    const first = await t.recorder.stop('track-ended');
    const second = await t.recorder.stop('user');

    assert.equal(second, first);
    assert.equal(first.reason, 'track-ended');
    assert.equal(t.source.subscriberCount(), 0);
  });

  it('publishes elapsed time and time left as it goes', async () => {
    const seen: Array<{ elapsedMs: number; state: string }> = [];
    const source = createFakePcmSource('granted');
    const fake = createFakeWriter();
    const recorder = createRecorder({
      source,
      writer: fake.writer,
      estimate: async () => ROOMY,
      chunkMs: CHUNK_MS,
      onProgress: (p) =>
        seen.push({ elapsedMs: p.elapsedMs, state: p.storageState }),
    });

    await recorder.start();
    for (let i = 0; i < 12; i += 1) {
      source.emitBlock(block(i));
    }
    await settle();
    await recorder.stop();

    assert.ok(seen.some((p) => p.state === 'ok'));
    assert.ok(seen.some((p) => p.elapsedMs >= 1000));
  });
});
