import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CEILING_HEADROOM,
  CEILING_KNEE,
  applyCeiling,
  createCeilingCurve,
  createMixLimiter,
} from './mix-limiter.ts';

const RATE = 1000;

const sine = (amplitude: number, length: number) =>
  Float32Array.from(
    { length },
    (_, index) => amplitude * Math.sin((2 * Math.PI * 7 * index) / RATE),
  );

const limit = (samples: Float32Array, channels = 1) => {
  const copy = Float32Array.from(samples);

  createMixLimiter(RATE).process(copy, channels);

  return copy;
};

const peakOf = (samples: Float32Array) =>
  samples.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0);

describe('applyCeiling', () => {
  it('leaves everything up to the knee untouched', () => {
    for (const value of [0, 0.1, -0.5, CEILING_KNEE, -CEILING_KNEE]) {
      assert.equal(applyCeiling(value), value);
    }
  });

  it('rises smoothly above the knee and never reaches full scale, however loud', () => {
    assert.ok(applyCeiling(0.9) > CEILING_KNEE && applyCeiling(0.9) < 0.9);
    assert.ok(applyCeiling(50) < CEILING_KNEE + CEILING_HEADROOM + 1e-9);
    assert.ok(applyCeiling(50) < 1 && applyCeiling(-50) > -1);
    assert.equal(applyCeiling(-0.9), -applyCeiling(0.9));
  });

  it('is the same function the live overlay gets as a lookup table', () => {
    const curve = createCeilingCurve(2001);

    curve.forEach((value, index) => {
      assert.ok(
        Math.abs(value - applyCeiling((index / 2000) * 2 - 1)) < 1e-6,
        `index ${index}`,
      );
    });
  });
});

describe('createMixLimiter', () => {
  it('leaves a signal below the knee exactly as it was', () => {
    const quiet = sine(0.7, 2000);

    assert.deepEqual(limit(quiet), quiet);
  });

  it('keeps a hugely boosted signal under full scale', () => {
    const boosted = limit(sine(8, 4000));

    assert.ok(peakOf(boosted) < CEILING_KNEE + CEILING_HEADROOM);
    assert.ok(peakOf(boosted) > 0.5);
  });

  it('gives the same samples whatever the chunk size', () => {
    const input = sine(3, 5000);
    const whole = limit(input);
    const pieces = Float32Array.from(input);
    const limiter = createMixLimiter(RATE);

    for (let start = 0; start < pieces.length; ) {
      const size = 1 + ((start * 7) % 613);

      limiter.process(pieces.subarray(start, start + size), 1);
      start += size;
    }

    assert.deepEqual(pieces, whole);
  });

  it('lowers every channel of a frame together, so the stereo image holds', () => {
    const frames = Float32Array.from([2, 0.1, 0.1, 0.1]);
    const out = limit(frames, 2);

    // The loud left channel sets the gain (0.84 / 2); the quiet right one follows it.
    assert.ok(Math.abs((out[1] ?? 0) - 0.1 * (0.84 / 2)) < 1e-6);
  });

  it('lets the level come back once the peak has passed', () => {
    const input = new Float32Array(700).fill(0.1);

    input[0] = 2;

    const out = limit(input);

    assert.ok((out[1] ?? 0) < 0.05);
    assert.ok(Math.abs((out[699] ?? 0) - 0.1) < 0.002);
  });
});
