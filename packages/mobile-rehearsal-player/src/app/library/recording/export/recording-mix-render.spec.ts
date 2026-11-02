import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  decodeWav,
  encodeWavParts,
  floatToInt16,
  type BlobLike,
  type DecodedTrack,
} from '@org/audio-mixing';

import { buildRecordingFixture } from '../recording-fixtures';
import {
  renderRecordingMix,
  type RecordingMixRenderDependencies,
} from './recording-mix-render';

const SAMPLE_RATE = 1000;
const DURATION_MS = 2000;

const concat = (parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;

  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }

  return out;
};

const toBlobLike = (bytes: Uint8Array): BlobLike => ({
  size: bytes.length,
  slice: (start, end) => ({
    arrayBuffer: async () =>
      bytes.buffer.slice(
        bytes.byteOffset + start,
        bytes.byteOffset + end,
      ) as ArrayBuffer,
  }),
});

/** A stored recording of a constant level. */
const storedRecording = (level: number): BlobLike => {
  const samples = floatToInt16(
    new Float32Array((DURATION_MS * SAMPLE_RATE) / 1000).fill(level),
  );

  return toBlobLike(
    concat(encodeWavParts([samples], { channels: 1, sampleRate: SAMPLE_RATE })),
  );
};

const constantTrack = (level: number): DecodedTrack => ({
  channels: [new Float32Array(SAMPLE_RATE * 5).fill(level)],
  sampleRate: SAMPLE_RATE,
});

const recording = buildRecordingFixture({
  durationMs: DURATION_MS,
  sampleRate: SAMPLE_RATE,
  timeline: [
    {
      held: false,
      recordingEndMs: DURATION_MS,
      recordingStartMs: 0,
      trackStartMs: 0,
    },
  ],
});

const deps = (
  overrides: Partial<RecordingMixRenderDependencies> = {},
): RecordingMixRenderDependencies => ({
  decodeTrack: async () => constantTrack(0.25),
  loadOriginal: async () => ({}) as Blob,
  readRecording: async () => storedRecording(0.125),
  ...overrides,
});

describe('renderRecordingMix', () => {
  it('renders a WAV of the recording over the track at the chosen balance and reports progress', async () => {
    const progress: number[] = [];
    const result = await renderRecordingMix(
      recording,
      { balance: 50, onProgress: (fraction) => progress.push(fraction) },
      deps(),
    );

    assert.equal(result.status, 'done');

    if (result.status !== 'done') return;

    const decoded = decodeWav(concat(result.parts));

    assert.equal(decoded.ok, true);

    if (!decoded.ok) return;

    const { wav } = decoded;

    assert.equal(wav.sampleRate, SAMPLE_RATE);
    assert.equal(wav.channels, 1);
    assert.equal(wav.samples.length, SAMPLE_RATE * 2);
    // Rate 1 time-stretching passes through SoundTouch, so allow its settling
    // at the start and check the steady state of the mix: 0.25 + 0.125.
    assert.ok(Math.abs((wav.samples[1500] ?? 0) / 32_767 - 0.375) < 0.02);
    assert.equal(progress.at(-1), 1);
  });

  it('keeps only the recording at balance 100', async () => {
    const result = await renderRecordingMix(
      recording,
      { balance: 100 },
      deps(),
    );

    assert.equal(result.status, 'done');

    if (result.status !== 'done') return;

    const decoded = decodeWav(concat(result.parts));

    assert.ok(
      decoded.ok &&
        Math.abs((decoded.wav.samples[1500] ?? 0) / 32_767 - 0.125) < 0.001,
    );
  });

  it('fails as missing when the recording is not stored or not a WAV', async () => {
    const notStored = await renderRecordingMix(
      recording,
      { balance: 50 },
      deps({ readRecording: async () => null }),
    );
    const notWav = await renderRecordingMix(
      recording,
      { balance: 50 },
      deps({ readRecording: async () => toBlobLike(new Uint8Array(100)) }),
    );

    assert.deepEqual(notStored, {
      reason: 'recording-missing',
      status: 'failed',
    });
    assert.deepEqual(notWav, { reason: 'recording-missing', status: 'failed' });
  });

  it('fails as original when the track cannot be loaded or decoded', async () => {
    const result = await renderRecordingMix(
      recording,
      { balance: 50 },
      deps({
        loadOriginal: async () => {
          throw new Error('offline');
        },
      }),
    );

    assert.deepEqual(result, { reason: 'original', status: 'failed' });
  });

  it('reports aborted when the signal is already aborted', async () => {
    const controller = new AbortController();

    controller.abort();

    const result = await renderRecordingMix(
      recording,
      { balance: 50, signal: controller.signal },
      deps(),
    );

    assert.deepEqual(result, { status: 'aborted' });
  });
});
