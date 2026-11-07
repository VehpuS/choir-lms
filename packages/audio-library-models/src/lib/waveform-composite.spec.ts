import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  combineStemPeakColumns,
  combineStemWaveforms,
  layStemsOnTimeline,
} from './waveform-composite.ts';
import {
  WAVEFORM_PEAKS_FORMAT_VERSION,
  type WaveformPeaks,
} from './waveform-peaks.ts';

// A steady stem: every bucket at `level` (0 to 1), one bucket per 10 ms.
const steady = (durationMs: number, level: number): WaveformPeaks => ({
  buckets: new Uint8Array(durationMs / 10).fill(Math.round(level * 255)),
  durationMs,
  formatVersion: WAVEFORM_PEAKS_FORMAT_VERSION,
});
const at = (peaks: WaveformPeaks | null, fraction: number): number => {
  assert.ok(peaks);

  return peaks.buckets[Math.floor(fraction * peaks.buckets.length)];
};

describe('combineStemWaveforms', () => {
  it('adds squares of equal stems, not amplitudes', () => {
    const peaks = combineStemWaveforms([
      { peaks: steady(1000, 0.5), offsetMs: 0, gain: 1 },
      { peaks: steady(1000, 0.5), offsetMs: 0, gain: 1 },
    ]);

    // sqrt(0.5² + 0.5²) = 0.707, not 1.0
    assert.ok(Math.abs(at(peaks, 0.5) - Math.round(0.7071 * 255)) <= 1);
  });

  it('leaves a muted stem out and scales a boosted one', () => {
    const muted = combineStemWaveforms([
      { peaks: steady(1000, 0.4), offsetMs: 0, gain: 0 },
      { peaks: steady(1000, 0.2), offsetMs: 0, gain: 1 },
    ]);
    const boosted = combineStemWaveforms([
      { peaks: steady(1000, 0.4), offsetMs: 0, gain: 1.5 },
    ]);

    assert.equal(at(muted, 0.5), Math.round(0.2 * 255));
    assert.ok(Math.abs(at(boosted, 0.5) - Math.round(0.6 * 255)) <= 1);
  });

  it('clips to full scale', () => {
    const peaks = combineStemWaveforms([
      { peaks: steady(1000, 1), offsetMs: 0, gain: 1.5 },
      { peaks: steady(1000, 1), offsetMs: 0, gain: 1.5 },
    ]);

    assert.equal(at(peaks, 0.5), 255);
  });

  it('is silent where a shorter stem has ended and as long as the longest stem', () => {
    const peaks = combineStemWaveforms([
      { peaks: steady(1000, 0.5), offsetMs: 0, gain: 1 },
      { peaks: steady(500, 0.5), offsetMs: 0, gain: 1 },
    ]);

    assert.equal(peaks?.durationMs, 1000);
    assert.ok(Math.abs(at(peaks, 0.25) - Math.round(0.7071 * 255)) <= 1);
    assert.equal(at(peaks, 0.75), Math.round(0.5 * 255));
  });

  it('shifts a stem by its offset and trims a negative offset', () => {
    const later = combineStemWaveforms([
      { peaks: steady(1000, 0.5), offsetMs: 500, gain: 1 },
    ]);
    const earlier = combineStemWaveforms([
      { peaks: steady(1000, 0.5), offsetMs: -500, gain: 1 },
    ]);

    assert.equal(later?.durationMs, 1500);
    assert.equal(at(later, 0.1), 0);
    assert.equal(at(later, 0.9), Math.round(0.5 * 255));
    assert.equal(earlier?.durationMs, 500);
    assert.equal(at(earlier, 0.5), Math.round(0.5 * 255));
  });

  it('returns nothing without stems', () => {
    assert.equal(combineStemWaveforms([]), null);
  });
});

describe('recombining on a gain change', () => {
  it('reuses the laid columns and follows new gains', () => {
    const laid = layStemsOnTimeline([
      { peaks: steady(1000, 0.4), offsetMs: 0 },
      { peaks: steady(1000, 0.2), offsetMs: 0 },
    ]);

    assert.ok(laid);

    const both = combineStemPeakColumns(laid.columns, [1, 1], laid.durationMs);
    const soloSecond = combineStemPeakColumns(
      laid.columns,
      [0, 1],
      laid.durationMs,
    );

    assert.ok(at(both, 0.5) > at(soloSecond, 0.5));
    assert.equal(at(soloSecond, 0.5), Math.round(0.2 * 255));
  });
});
