import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createClickTemplate,
  measureClickLatency,
  renderClickTrain,
} from './click-calibration.ts';

const SAMPLE_RATE = 44100;
const TOTAL_MS = 4000;
const SCHEDULED = [200, 700, 1200, 1700, 2200];

/** Deterministic noise in -amount..amount. */
const noise = (length: number, amount: number) => {
  let state = 12345;

  return Float32Array.from({ length }, () => {
    state = (state * 1664525 + 1013904223) % 4294967296;

    return (state / 4294967296 - 0.5) * 2 * amount;
  });
};

const heard = (options: {
  latencyMs: number | ((index: number) => number);
  skip?: number[];
  echoMs?: number;
  noiseAmount?: number;
  gain?: number;
}) => {
  const template = createClickTemplate(SAMPLE_RATE);
  const starts = SCHEDULED.flatMap((scheduled, i) => {
    if (options.skip?.includes(i)) {
      return [];
    }

    const latency =
      typeof options.latencyMs === 'number'
        ? options.latencyMs
        : options.latencyMs(i);

    return [scheduled + latency];
  });
  const direct = renderClickTrain(template, starts, TOTAL_MS, SAMPLE_RATE);
  const echo = options.echoMs
    ? renderClickTrain(
        template,
        starts.map((s) => s + (options.echoMs ?? 0)),
        TOTAL_MS,
        SAMPLE_RATE,
      )
    : new Float32Array(direct.length);
  const background = noise(direct.length, options.noiseAmount ?? 0);
  const gain = options.gain ?? 0.3;

  return Float32Array.from(
    direct,
    (v, i) => v * gain + (echo[i] ?? 0) * gain * 0.7 + (background[i] ?? 0),
  );
};

const measure = (recorded: Float32Array) =>
  measureClickLatency({
    recorded,
    sampleRate: SAMPLE_RATE,
    scheduledMs: SCHEDULED,
  });

describe('measureClickLatency', () => {
  it('recovers the round trip to a fraction of a millisecond', () => {
    const result = measure(heard({ latencyMs: 83.3 }));

    assert.ok(result.ok);
    assert.ok(Math.abs(result.latencyMs - 83.3) < 0.2);
    assert.equal(result.found, 5);
  });

  it('survives background noise', () => {
    const result = measure(heard({ latencyMs: 120, noiseAmount: 0.05 }));

    assert.ok(result.ok);
    assert.ok(Math.abs(result.latencyMs - 120) < 0.5);
  });

  it('still succeeds when one click is missing', () => {
    const result = measure(heard({ latencyMs: 60, skip: [2] }));

    assert.ok(result.ok);
    assert.equal(result.found, 4);
    assert.ok(Math.abs(result.latencyMs - 60) < 0.2);
  });

  it('takes the first arrival when a click is doubled by an echo', () => {
    const result = measure(heard({ latencyMs: 70, echoMs: 25 }));

    assert.ok(result.ok);
    assert.ok(Math.abs(result.latencyMs - 70) < 0.3);
  });

  it('fails with not-heard on noise alone, and on too few clicks', () => {
    const silent = measure(noise(SAMPLE_RATE * 4, 0.05));
    const sparse = measure(heard({ latencyMs: 50, skip: [0, 1, 2] }));

    assert.deepEqual([silent.ok, sparse.ok], [false, false]);
    assert.equal(silent.ok ? '' : silent.reason, 'not-heard');
    assert.equal(sparse.ok ? '' : sparse.reason, 'not-heard');
  });

  it('fails with inconsistent when the clicks disagree about the latency', () => {
    const result = measure(heard({ latencyMs: (i) => 50 + i * 12 }));

    assert.equal(result.ok, false);
    assert.equal(result.ok ? '' : result.reason, 'inconsistent');
  });
});
