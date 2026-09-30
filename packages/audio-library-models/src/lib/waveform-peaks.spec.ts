import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_PEAK_BUCKETS,
  WAVEFORM_PEAKS_FORMAT_VERSION,
  computeWaveformPeaks,
  deserializeWaveformPeaks,
  getPeakBucketCount,
  getWaveformPeakGain,
  resolveWaveformBars,
  serializeWaveformPeaks,
  type WaveformPeaks,
} from './waveform-peaks.js';

const SAMPLE_RATE = 1000;

const createPeaks = (values: number[], durationMs: number): WaveformPeaks => {
  return {
    buckets: Uint8Array.from(values),
    durationMs,
    formatVersion: WAVEFORM_PEAKS_FORMAT_VERSION,
  };
};

describe('waveform peak bucket count', () => {
  it('uses one bucket per millisecond for short tracks', () => {
    assert.equal(getPeakBucketCount(0.5), 500);
    assert.equal(getPeakBucketCount(60), 60_000);
  });

  it('caps long tracks at the maximum, reached at two minutes', () => {
    assert.equal(getPeakBucketCount(120), MAX_PEAK_BUCKETS);
    assert.equal(getPeakBucketCount(334), MAX_PEAK_BUCKETS);
  });

  it('gives at least one bucket to a very short track and none to no audio', () => {
    assert.equal(getPeakBucketCount(0.0001), 1);
    assert.equal(getPeakBucketCount(0), 0);
    assert.equal(getPeakBucketCount(Number.NaN), 0);
  });
});

describe('computing waveform peaks from PCM', () => {
  it('places a transient in the bucket it falls in', () => {
    const channel = new Float32Array(SAMPLE_RATE);

    channel[500] = 0.5;

    const peaks = computeWaveformPeaks([channel], SAMPLE_RATE);

    assert.equal(peaks?.buckets.length, 1000);
    assert.equal(peaks?.buckets[500], 128);
    assert.equal(peaks?.buckets[499], 0);
    assert.equal(peaks?.durationMs, 1000);
  });

  it('keeps the loudest absolute sample across channels and polarity', () => {
    const left = Float32Array.from([0.1, -0.2]);
    const right = Float32Array.from([-0.6, 0.3]);
    const peaks = computeWaveformPeaks([left, right], 2);

    assert.deepEqual(Array.from(peaks?.buckets ?? []), [153, 77]);
  });

  it('stretches buckets over a long track instead of exceeding the cap', () => {
    const channel = new Float32Array(200 * SAMPLE_RATE).fill(0.25);
    const peaks = computeWaveformPeaks([channel], SAMPLE_RATE);

    assert.equal(peaks?.buckets.length, MAX_PEAK_BUCKETS);
    assert.equal(peaks?.buckets[MAX_PEAK_BUCKETS - 1], 64);
  });

  it('renders different audio as different peaks', () => {
    const quietThenLoud = Float32Array.from([0.1, 0.1, 0.9, 0.9]);
    const loudThenQuiet = Float32Array.from([0.9, 0.9, 0.1, 0.1]);

    assert.notDeepEqual(
      Array.from(computeWaveformPeaks([quietThenLoud], 4)?.buckets ?? []),
      Array.from(computeWaveformPeaks([loudThenQuiet], 4)?.buckets ?? []),
    );
  });

  it('returns null when there is no audio to analyze', () => {
    assert.equal(computeWaveformPeaks([], SAMPLE_RATE), null);
    assert.equal(
      computeWaveformPeaks([new Float32Array(0)], SAMPLE_RATE),
      null,
    );
    assert.equal(computeWaveformPeaks([Float32Array.of(1)], 0), null);
  });
});

describe('waveform peak persistence', () => {
  it('round-trips buckets of every padding length', () => {
    for (const length of [1, 2, 3, 4, 5, 255, 256]) {
      const buckets = Array.from({ length }, (_, index) => (index * 7) % 256);
      const peaks = createPeaks(buckets, 1234);
      const restored = deserializeWaveformPeaks(
        JSON.parse(JSON.stringify(serializeWaveformPeaks(peaks))),
      );

      assert.deepEqual(Array.from(restored?.buckets ?? []), buckets);
      assert.equal(restored?.durationMs, 1234);
    }
  });

  it('rejects peaks written by another format version', () => {
    const serialized = serializeWaveformPeaks(createPeaks([1, 2, 3], 1000));

    assert.equal(
      deserializeWaveformPeaks({
        ...serialized,
        formatVersion: WAVEFORM_PEAKS_FORMAT_VERSION + 1,
      }),
      null,
    );
  });

  it('rejects malformed values without throwing', () => {
    for (const value of [
      null,
      'peaks',
      {},
      { data: 'AAAA', durationMs: 0, formatVersion: 1 },
      { data: 'AAA', durationMs: 1000, formatVersion: 1 },
      { data: '!!!!', durationMs: 1000, formatVersion: 1 },
      { data: '', durationMs: 1000, formatVersion: 1 },
    ]) {
      assert.equal(deserializeWaveformPeaks(value), null);
    }
  });
});

describe('resolving waveform bars', () => {
  const peaks = createPeaks([10, 20, 30, 40, 50, 60, 70, 80], 8000);

  it('keeps the loudest bucket of each bar across the whole item', () => {
    assert.deepEqual(
      resolveWaveformBars(peaks, { endMs: 8000, startMs: 0 }, 4).map((bar) =>
        Math.round(bar * 255),
      ),
      [20, 40, 60, 80],
    );
  });

  it('shows only the range of a loop, at its own resolution', () => {
    assert.deepEqual(
      resolveWaveformBars(peaks, { endMs: 6000, startMs: 4000 }, 2).map((bar) =>
        Math.round(bar * 255),
      ),
      [50, 60],
    );
  });

  it('draws more bars than buckets by repeating the nearest bucket', () => {
    const bars = resolveWaveformBars(peaks, { endMs: 2000, startMs: 0 }, 8);

    assert.equal(bars.length, 8);
    assert.ok(bars.every((bar) => bar > 0));
  });

  it('scales by the track gain so its loudest point fills the height', () => {
    const gain = getWaveformPeakGain(peaks);
    const bars = resolveWaveformBars(
      peaks,
      { endMs: 8000, startMs: 0 },
      8,
      gain,
    );

    assert.equal(Math.max(...bars), 1);
  });

  it('returns no bars when there is nothing to draw', () => {
    assert.deepEqual(
      resolveWaveformBars(peaks, { endMs: 8000, startMs: 0 }, 0),
      [],
    );
    assert.equal(getWaveformPeakGain(createPeaks([0, 0], 1000)), 1);
  });
});
