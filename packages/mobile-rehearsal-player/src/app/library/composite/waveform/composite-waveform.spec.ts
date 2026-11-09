import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { WaveformPeaks } from '@org/audio-library-models';

import {
  combineCompositeWaveform,
  layCompositeStemPeaks,
} from './composite-waveform';

const peaks = (...buckets: number[]): WaveformPeaks => ({
  buckets: Uint8Array.from(buckets),
  durationMs: buckets.length * 1000,
  formatVersion: 1,
});

describe('composite waveform', () => {
  const laid = layCompositeStemPeaks([
    { stemId: 'a', offsetMs: 0, peaks: peaks(100, 100) },
    { stemId: 'b', offsetMs: 0, peaks: peaks(100, 100) },
    { stemId: 'silent', offsetMs: 0, peaks: null },
  ]);

  it('leaves out stems without peaks and scales by the full mix', () => {
    assert.ok(laid);
    assert.deepEqual(laid.stemIds, ['a', 'b']);
    // Two equal stems add in squares: 100 * sqrt(2) is the loudest point.
    assert.ok(Math.abs(laid.referenceGain - 255 / (100 * Math.SQRT2)) < 0.05);
  });

  it('shows less when a stem is muted, with the same scale', () => {
    assert.ok(laid);

    const full = combineCompositeWaveform(laid, { a: 1, b: 1 });
    const oneMuted = combineCompositeWaveform(laid, { a: 1, b: 0 });

    assert.ok(full && oneMuted);
    assert.ok(oneMuted.peaks.buckets[0] < full.peaks.buckets[0]);
    assert.equal(oneMuted.gain, full.gain);
  });

  it('is nothing without any peaks', () => {
    assert.equal(
      layCompositeStemPeaks([{ stemId: 'a', offsetMs: 0, peaks: null }]),
      null,
    );
  });
});
