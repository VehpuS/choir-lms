/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getPitchPreservingTrackOptions } from './pitch-preserving-track-options.js';
import {
  canShapePitchOnPlatform,
  PITCH_UNAVAILABLE_REASON,
} from './playback-shaping-capabilities.js';
import { createDefaultPitchShifter } from './web-pitch-shifter.js';

describe('pitch capability', () => {
  it('is available only on web with AudioWorklet support', () => {
    assert.equal(
      canShapePitchOnPlatform({ hasAudioWorklet: true, platformOs: 'web' }),
      true,
    );
    assert.equal(
      canShapePitchOnPlatform({ hasAudioWorklet: false, platformOs: 'web' }),
      false,
    );
  });

  it('is unavailable on native iOS and Android, by decision (tasks 8.51)', () => {
    for (const platformOs of ['ios', 'android', null]) {
      assert.equal(
        canShapePitchOnPlatform({ hasAudioWorklet: true, platformOs }),
        false,
      );
    }
  });

  it('gives the native fallback a stated reason', () => {
    assert.equal(PITCH_UNAVAILABLE_REASON, 'Not available on this device yet');
  });

  it('has no pitch shifter in the native build', () => {
    assert.equal(createDefaultPitchShifter(), null);
  });
});

describe('pitch-preserving track options', () => {
  it('asks AVPlayer for the Music algorithm when the module names it', () => {
    assert.deepEqual(getPitchPreservingTrackOptions({ Music: 'music' }), {
      pitchAlgorithm: 'music',
    });
  });

  it('adds nothing when the player module has no pitch algorithms', () => {
    assert.deepEqual(getPitchPreservingTrackOptions(undefined), {});
    assert.deepEqual(getPitchPreservingTrackOptions({}), {});
  });
});
