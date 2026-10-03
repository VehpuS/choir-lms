/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canResetShaping,
  getPitchControlModel,
  getPitchStripBars,
  getPracticeShapingTiles,
  getSpeedControlModel,
  getTempoSourceChips,
  resolveSpeedSliderValue,
  stepPitchSemitones,
} from './shaping-surface-model.js';

const NEUTRAL = { pitchSemitones: 0, speedMultiplier: 1 };

describe('speed control', () => {
  it('places the 1.00× detent off-centre on the linear 0.25–2.00 track', () => {
    const model = getSpeedControlModel(1);

    assert.ok(Math.abs(model.detentRatio - 0.75 / 1.75) < 1e-9);
    assert.deepEqual(
      model.scaleLabels.map((label) => label.label),
      ['0.25×', '1.00×', '2.00×'],
    );
    assert.deepEqual(
      model.scaleLabels.map((label) => label.ratio === 0 || label.ratio === 1),
      [true, false, true],
    );
  });

  it('shows a fixed-width readout and marks only non-default speeds as shaped', () => {
    assert.equal(getSpeedControlModel(0.9).readout, '0.90×');
    assert.equal(getSpeedControlModel(0.9).isShaped, true);
    assert.equal(getSpeedControlModel(1).isShaped, false);
  });

  it('snaps slider values near 1.00× onto the detent and clamps the ends', () => {
    assert.equal(resolveSpeedSliderValue(1.015), 1);
    assert.equal(resolveSpeedSliderValue(0.97), 0.97);
    assert.equal(resolveSpeedSliderValue([0.1]), 0.25);
    assert.equal(resolveSpeedSliderValue(5), 2);
  });
});

describe('pitch control', () => {
  it('offers both steps inside the range and stops at the ends', () => {
    assert.equal(
      getPitchControlModel({ canShapePitch: true, pitchSemitones: 12 })
        .canStepUp,
      false,
    );
    assert.equal(
      getPitchControlModel({ canShapePitch: true, pitchSemitones: -12 })
        .canStepDown,
      false,
    );
    const middle = getPitchControlModel({
      canShapePitch: true,
      pitchSemitones: 0,
    });

    assert.equal(middle.canStepUp && middle.canStepDown, true);
  });

  it('shows signed readouts and treats zero as unshaped', () => {
    const lowered = getPitchControlModel({
      canShapePitch: true,
      pitchSemitones: -2,
    });
    const zero = getPitchControlModel({
      canShapePitch: true,
      pitchSemitones: 0,
    });

    assert.equal(lowered.readout, '−2 st');
    assert.equal(lowered.isShaped, true);
    assert.equal(zero.isShaped, false);
  });

  it('is live where pitch can be shifted', () => {
    const live = getPitchControlModel({
      canShapePitch: true,
      pitchSemitones: 3,
    });

    assert.equal(live.isInert, false);
    assert.equal(live.unavailableReason, null);
    assert.equal(live.canStepUp, true);
  });

  it('is inert with a stated reason where pitch cannot be shifted', () => {
    const inert = getPitchControlModel({
      canShapePitch: false,
      pitchSemitones: 5,
    });

    assert.equal(inert.isInert, true);
    assert.equal(inert.unavailableReason, 'Not available on this device yet');
    assert.equal(inert.canStepUp, false);
    assert.equal(inert.canStepDown, false);
    assert.equal(inert.isShaped, false);
  });

  it('steps by one semitone and clamps at the ends', () => {
    assert.equal(stepPitchSemitones(0, 1), 1);
    assert.equal(stepPitchSemitones(-12, -1), -12);
    assert.equal(stepPitchSemitones(12, 1), 12);
  });
});

describe('pitch strip', () => {
  const kinds = (pitchSemitones: number) =>
    getPitchStripBars(pitchSemitones).map((bar) => bar.kind);

  it('draws nine bars with zero at full height in the middle', () => {
    assert.equal(getPitchStripBars(0).length, 9);
    assert.equal(getPitchStripBars(0)[4]?.kind, 'zero');
    assert.deepEqual(new Set(kinds(0)), new Set(['zero', 'idle']));
  });

  it('fills the bars between zero and the value, on the value side only', () => {
    assert.deepEqual(kinds(6), [
      'idle',
      'idle',
      'idle',
      'idle',
      'zero',
      'filled',
      'filled',
      'idle',
      'idle',
    ]);
    assert.deepEqual(kinds(-12), [
      'filled',
      'filled',
      'filled',
      'filled',
      'zero',
      'idle',
      'idle',
      'idle',
      'idle',
    ]);
  });
});

describe('tempo source chips', () => {
  it('selects the multiplier and shows BPM and score inert', () => {
    assert.deepEqual(
      getTempoSourceChips().map((chip) => [
        chip.key,
        chip.selected,
        chip.disabled,
      ]),
      [
        ['multiplier', true, false],
        ['bpm', false, true],
        ['score', false, true],
      ],
    );
  });
});

describe('reset and practice tiles', () => {
  it('offers reset only when the session is shaped', () => {
    assert.equal(canResetShaping(NEUTRAL), false);
    assert.equal(
      canResetShaping({ pitchSemitones: -1, speedMultiplier: 1 }),
      true,
    );
    assert.equal(
      canResetShaping({ pitchSemitones: 0, speedMultiplier: 0.8 }),
      true,
    );
  });

  it('builds the speed and pitch readout tiles', () => {
    const tiles = getPracticeShapingTiles({
      canShapePitch: true,
      effective: { pitchSemitones: -2, speedMultiplier: 0.9 },
    });

    assert.deepEqual(
      tiles.map((tile) => [tile.key, tile.kicker, tile.readout, tile.isShaped]),
      [
        ['speed', 'Speed', '0.90×', true],
        ['pitch', 'Pitch', '−2 st', true],
      ],
    );
  });

  it('marks the pitch tile inert and never shows a pitch value where it cannot be shifted', () => {
    const [, pitchTile] = getPracticeShapingTiles({
      canShapePitch: false,
      effective: { pitchSemitones: 0, speedMultiplier: 1 },
    });

    assert.equal(pitchTile?.isInert, true);
    assert.equal(pitchTile?.readout, '—');
    assert.ok(
      pitchTile?.accessibilityLabel.includes(
        'Not available on this device yet',
      ),
    );
  });
});
