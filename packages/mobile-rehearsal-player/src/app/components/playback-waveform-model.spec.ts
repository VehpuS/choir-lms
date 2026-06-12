import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  hasWaveformProgressSettled,
  isWaveformScrubReady,
  resolveWaveformCommitRatio,
  resolveWaveformRatioFromLocation,
} from './playback-waveform-model.js';

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
});
