import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  downsampleWaveformBars,
  getProgressLineWidth,
  hasWaveformProgressSettled,
  isWaveformBarPlayed,
  isWaveformScrubReady,
  resolveWaveformCommitRatio,
  resolveWaveformRatioFromLocation,
} from './model.js';

describe('PlaybackWaveformModel', () => {
  it('keeps waveform taps disabled until scrub layout is ready', () => {
    assert.equal(
      isWaveformScrubReady({
        hasScrubRange: true,
        interactive: true,
        layoutWidth: 0,
        onScrubToPosition: () => undefined,
      }),
      false,
    );
    assert.equal(
      isWaveformScrubReady({
        hasScrubRange: true,
        interactive: true,
        layoutWidth: 240,
        onScrubToPosition: () => undefined,
      }),
      true,
    );
  });

  it('commits the granted waveform ratio when release coordinates are unreliable', () => {
    assert.equal(
      resolveWaveformCommitRatio({
        draftRatio: 0.64,
        layoutWidth: 280,
        locationX: 0,
      }),
      0.64,
    );
    assert.equal(resolveWaveformRatioFromLocation(140, 280), 0.5);
  });

  it('holds the waveform target ratio until playback progress catches up', () => {
    assert.equal(
      hasWaveformProgressSettled({
        progressRatio: 0.05,
        targetRatio: 0.6,
      }),
      false,
    );
    assert.equal(
      hasWaveformProgressSettled({
        progressRatio: 0.592,
        targetRatio: 0.6,
      }),
      true,
    );
  });

  it('downsamples bars to the requested count while keeping each bucket peak', () => {
    assert.deepEqual(
      downsampleWaveformBars([0.1, 0.9, 0.2, 0.3, 0.8, 0.4], 3),
      [0.9, 0.3, 0.8],
    );
  });

  it('returns short bar series unchanged and empty series for no bars', () => {
    assert.deepEqual(downsampleWaveformBars([0.2, 0.4], 9), [0.2, 0.4]);
    assert.deepEqual(downsampleWaveformBars([0.2, 0.4], 0), []);
  });

  it('marks a bar played once progress reaches its trailing edge', () => {
    assert.equal(
      isWaveformBarPlayed({ barCount: 4, barIndex: 0, progressRatio: 0.24 }),
      false,
    );
    assert.equal(
      isWaveformBarPlayed({ barCount: 4, barIndex: 0, progressRatio: 0.25 }),
      true,
    );
  });

  it('clamps the progress line width between empty and full', () => {
    assert.equal(getProgressLineWidth(-0.5), '0%');
    assert.equal(getProgressLineWidth(0.5), '50%');
    assert.equal(getProgressLineWidth(3), '100%');
  });
});
