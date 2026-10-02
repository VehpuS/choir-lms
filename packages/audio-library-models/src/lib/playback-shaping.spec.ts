import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PLAYBACK_SHAPING,
  clampPitchSemitones,
  clampSpeedMultiplier,
  isPitchShaped,
  isPlaybackShapingNeutral,
  isSpeedShaped,
  isTempoSourceImplemented,
  normalizePlaybackShaping,
  snapSpeedMultiplier,
} from './playback-shaping.js';

describe('speed multiplier', () => {
  it('keeps values inside 0.25–2.00', () => {
    assert.equal(clampSpeedMultiplier(0.1), 0.25);
    assert.equal(clampSpeedMultiplier(0.25), 0.25);
    assert.equal(clampSpeedMultiplier(2), 2);
    assert.equal(clampSpeedMultiplier(3), 2);
  });

  it('rounds to two decimals so the readout is exact', () => {
    assert.equal(clampSpeedMultiplier(0.8999999), 0.9);
    assert.equal(clampSpeedMultiplier(1.234), 1.23);
  });

  it('treats anything that is not a finite number as 1.00', () => {
    for (const value of [undefined, null, '0.8', Number.NaN, Infinity]) {
      assert.equal(clampSpeedMultiplier(value), 1);
    }
  });

  it('snaps near 1.00× onto the detent and leaves other speeds alone', () => {
    assert.equal(snapSpeedMultiplier(0.99), 1);
    assert.equal(snapSpeedMultiplier(1.02), 1);
    assert.equal(snapSpeedMultiplier(1.03), 1.03);
    assert.equal(snapSpeedMultiplier(0.9), 0.9);
  });
});

describe('pitch semitones', () => {
  it('keeps whole semitones inside −12…+12', () => {
    assert.equal(clampPitchSemitones(-30), -12);
    assert.equal(clampPitchSemitones(30), 12);
    assert.equal(clampPitchSemitones(5), 5);
  });

  it('rounds fractions to whole semitones', () => {
    assert.equal(clampPitchSemitones(2.4), 2);
    assert.equal(clampPitchSemitones(-2.6), -3);
  });

  it('never returns negative zero', () => {
    assert.ok(Object.is(clampPitchSemitones(-0.2), 0));
  });

  it('treats anything that is not a finite number as 0', () => {
    for (const value of [undefined, null, '3', Number.NaN, -Infinity]) {
      assert.equal(clampPitchSemitones(value), 0);
    }
  });
});

describe('normalizePlaybackShaping', () => {
  it('defaults to the neutral multiplier shaping', () => {
    assert.deepEqual(
      normalizePlaybackShaping(undefined),
      DEFAULT_PLAYBACK_SHAPING,
    );
    assert.deepEqual(
      normalizePlaybackShaping('garbage'),
      DEFAULT_PLAYBACK_SHAPING,
    );
    assert.deepEqual(DEFAULT_PLAYBACK_SHAPING, {
      pitchSemitones: 0,
      speedMultiplier: 1,
      tempoSource: 'multiplier',
    });
  });

  it('clamps every field of a stored or untrusted value', () => {
    assert.deepEqual(
      normalizePlaybackShaping({
        pitchSemitones: 40,
        speedMultiplier: 0.2,
        tempoSource: 'score',
      }),
      { pitchSemitones: 12, speedMultiplier: 0.25, tempoSource: 'score' },
    );
  });

  it('replaces an unknown tempo source with multiplier', () => {
    assert.equal(
      normalizePlaybackShaping({ tempoSource: 'metronome' }).tempoSource,
      'multiplier',
    );
  });
});

describe('tempo source support', () => {
  it('implements only the multiplier source for now', () => {
    assert.equal(isTempoSourceImplemented('multiplier'), true);
    assert.equal(isTempoSourceImplemented('bpm'), false);
    assert.equal(isTempoSourceImplemented('score'), false);
  });
});

describe('shaped state', () => {
  it('treats 1.00× and 0 st as unshaped', () => {
    assert.equal(isPlaybackShapingNeutral(DEFAULT_PLAYBACK_SHAPING), true);
  });

  it('reports each axis separately', () => {
    const speedOnly = { pitchSemitones: 0, speedMultiplier: 0.9 };
    const pitchOnly = { pitchSemitones: -2, speedMultiplier: 1 };

    assert.equal(isSpeedShaped(speedOnly), true);
    assert.equal(isPitchShaped(speedOnly), false);
    assert.equal(isPitchShaped(pitchOnly), true);
    assert.equal(isPlaybackShapingNeutral(pitchOnly), false);
  });
});
