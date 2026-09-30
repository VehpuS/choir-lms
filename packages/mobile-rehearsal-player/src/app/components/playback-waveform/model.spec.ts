import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WAVEFORM_PEAKS_FORMAT_VERSION,
  createLoopPlayableItem,
  createTrackPlayableItem,
  type WaveformPeaks,
} from '@org/audio-library-models';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../test-utils/library-test-fixtures.js';
import {
  FLAT_WAVEFORM_BAR_AMPLITUDE,
  resolvePlaybackWaveformBars,
  getProgressLineWidth,
  hasWaveformProgressSettled,
  isWaveformBarPlayed,
  isWaveformScrubReady,
  resolveWaveformCommitRatio,
  resolveWaveformRatioFromLocation,
} from './model.js';

const createPeaks = (buckets: number[]): WaveformPeaks => {
  return {
    buckets: Uint8Array.from(buckets),
    durationMs: 4000,
    formatVersion: WAVEFORM_PEAKS_FORMAT_VERSION,
  };
};

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

  it('draws a flat placeholder band, never a synthetic shape, while peaks are unavailable', () => {
    const bars = resolvePlaybackWaveformBars({
      barCount: 5,
      item: createTrackPlayableItem(PLAYABLE_SOURCE),
      peaks: null,
    });

    assert.deepEqual(bars, Array(5).fill(FLAT_WAVEFORM_BAR_AMPLITUDE));
  });

  it('draws bars from the item’s own peaks so different items differ', () => {
    const item = createTrackPlayableItem({
      ...PLAYABLE_SOURCE,
      durationMs: 4000,
    });
    const quietFirst = createPeaks([20, 20, 200, 200]);
    const loudFirst = createPeaks([200, 200, 20, 20]);

    const first = resolvePlaybackWaveformBars({
      barCount: 2,
      item,
      peaks: quietFirst,
    });
    const second = resolvePlaybackWaveformBars({
      barCount: 2,
      item,
      peaks: loudFirst,
    });

    assert.ok(first[0] < first[1]);
    assert.ok(second[0] > second[1]);
  });

  it('draws only the loop’s range of the track’s peaks', () => {
    const loop = createLoopPlayableItem(
      { ...SAVED_LOOP, endMs: 4000, startMs: 2000 },
      { ...PLAYABLE_SOURCE, durationMs: 4000 },
    );
    const bars = resolvePlaybackWaveformBars({
      barCount: 2,
      item: loop,
      peaks: createPeaks([10, 10, 200, 200]),
    });

    assert.ok(bars.every((bar) => bar > 0.999));
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
