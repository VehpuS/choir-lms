import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { renderComposite } from './composite-renderer.ts';
import { createReader } from './mix-render-test-fakes.ts';
import { createSoundTouchSumShaper } from './soundtouch-sum-shaper.ts';

const SAMPLE_RATE = 44_100;
const INT16_MAX = 32_767;
const HERTZ = 440;
const SECONDS = 2;

const sine = (index: number) =>
  0.3 * Math.sin((2 * Math.PI * HERTZ * index) / SAMPLE_RATE);

/** Frequency of a signal, from its zero crossings. */
const estimateHertz = (samples: Int16Array): number => {
  let crossings = 0;

  for (let index = 1; index < samples.length; index += 1) {
    if ((samples[index - 1] ?? 0) < 0 !== (samples[index] ?? 0) < 0) {
      crossings += 1;
    }
  }

  return crossings / 2 / (samples.length / SAMPLE_RATE);
};

const rms = (samples: Int16Array) =>
  Math.sqrt(
    samples.reduce((sum, value) => sum + (value / INT16_MAX) ** 2, 0) /
      samples.length,
  );

const render = async (shaping: { rate: number; pitchSemitones: number }) => {
  const chunks: Int16Array[] = [];
  const result = await renderComposite({
    shaper: createSoundTouchSumShaper(SAMPLE_RATE),
    shaping,
    stems: [
      {
        gain: 1,
        id: 'a',
        offsetMs: 0,
        reader: createReader(SAMPLE_RATE * SECONDS, sine, SAMPLE_RATE),
      },
    ],
    write: (samples) => {
      chunks.push(samples);
    },
  });

  return {
    result,
    samples: Int16Array.from(chunks.flatMap((chunk) => [...chunk])),
  };
};

// The middle of the render, away from the stretcher's start-up and tail.
const middle = (samples: Int16Array) =>
  samples.subarray(
    Math.floor(samples.length * 0.25),
    Math.floor(samples.length * 0.75),
  );

describe('createSoundTouchSumShaper', () => {
  it('slows the sum without changing its pitch or level', async () => {
    const { result, samples } = await render({ rate: 0.5, pitchSemitones: 0 });

    assert.equal(result.status, 'done');
    assert.equal(samples.length, SAMPLE_RATE * SECONDS * 2);
    assert.ok(Math.abs(estimateHertz(middle(samples)) - HERTZ) < 15);
    // A sine's RMS is its peak over √2; the shaped level stays within a few percent.
    assert.ok(Math.abs(rms(middle(samples)) - 0.3 / Math.SQRT2) < 0.02);
  });

  it('raises the pitch by an octave at the same speed', async () => {
    const { samples } = await render({ rate: 1, pitchSemitones: 12 });

    assert.equal(samples.length, SAMPLE_RATE * SECONDS);
    assert.ok(Math.abs(estimateHertz(middle(samples)) - HERTZ * 2) < 30);
  });

  it('speeds the sum up, ending near the shortened length', async () => {
    const { samples } = await render({ rate: 1.5, pitchSemitones: -2 });

    assert.equal(samples.length, Math.round((SAMPLE_RATE * SECONDS) / 1.5));
    assert.ok(rms(middle(samples)) > 0.1);
  });
});
