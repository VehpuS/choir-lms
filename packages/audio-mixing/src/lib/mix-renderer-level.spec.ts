import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dbToLinear } from '@org/audio-library-models';

import { CEILING_HEADROOM, CEILING_KNEE } from './mix-limiter.ts';
import { renderMix } from './mix-renderer.ts';
import { createReader, createStretcher } from './mix-render-test-fakes.ts';

const INT16_MAX = 32_767;
const recording = {
  durationMs: 2000,
  nudgeMs: 0,
  shaping: { pitchSemitones: 0, rate: 1 },
  timeline: [
    { held: false, recordingEndMs: 2000, recordingStartMs: 0, trackStartMs: 0 },
  ],
};

const render = async (options: {
  track: number;
  voice: number;
  levelDb?: number;
  chunkFrames?: number;
}) => {
  const chunks: Int16Array[] = [];
  const { stretcher } = createStretcher({ constant: options.track });
  const result = await renderMix({
    balance: 50,
    chunkFrames: options.chunkFrames,
    levelGain: dbToLinear(options.levelDb ?? 0),
    reader: createReader(2000, () => options.voice),
    recording,
    stretcher,
    write: (samples) => {
      chunks.push(samples);
    },
  });

  return {
    chunks,
    result,
    samples: Int16Array.from(chunks.flatMap((c) => [...c])),
  };
};

const peak = (samples: Int16Array) =>
  samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0) / INT16_MAX;

describe('renderMix with a level and a loud track', () => {
  it('does not clip a quiet recording boosted by +18 dB over a full-level track', async () => {
    const { result, samples } = await render({
      levelDb: 18,
      track: 0.9,
      voice: 0.1,
    });

    assert.equal(result.status, 'done');
    // 0.9 + 0.1 * 7.94 is about 1.7 before limiting; nothing may reach full scale.
    assert.ok(peak(samples) < CEILING_KNEE + CEILING_HEADROOM + 1e-3);
    assert.ok(samples.every((value) => Math.abs(value) < INT16_MAX));
  });

  it('leaves a mix below the knee exactly as the plain sum', async () => {
    const { samples } = await render({ track: 0.3, voice: 0.2 });

    assert.ok(samples.every((value) => value === Math.round(0.5 * INT16_MAX)));
  });

  it('raises the recording by its level when nothing needs limiting', async () => {
    const plain = await render({ track: 0.1, voice: 0.1 });
    const boosted = await render({ levelDb: 6, track: 0.1, voice: 0.1 });

    // 0.1 + 0.1 = 0.2, and 0.1 + 0.1 * 1.995 = about 0.2995.
    assert.ok(Math.abs(peak(plain.samples) - 0.2) < 1e-3);
    assert.ok(Math.abs(peak(boosted.samples) - 0.2995) < 2e-3);
  });

  it('renders the same samples whatever the chunk size', async () => {
    const big = await render({
      levelDb: 12,
      track: 0.8,
      voice: 0.2,
      chunkFrames: 100_000,
    });
    const small = await render({
      levelDb: 12,
      track: 0.8,
      voice: 0.2,
      chunkFrames: 137,
    });

    assert.deepEqual(small.samples, big.samples);
  });
});
