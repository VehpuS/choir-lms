/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createPlaybackShapingEngine,
  UnsupportedSpeedTransformError,
} from './playback-shaping-engine.js';

// Lightweight fakes record calls: the engine's contract is which player and
// shifter calls it makes, and what state it reports afterwards.
const createFakes = (options: { withShifter: boolean }) => {
  const rates: number[] = [];
  const semitones: number[] = [];

  return {
    engine: createPlaybackShapingEngine({
      pitchShifter: options.withShifter
        ? { setSemitones: async (value) => void semitones.push(value) }
        : null,
      player: { setRate: async (rate) => void rates.push(rate) },
    }),
    rates,
    semitones,
  };
};

describe('playback shaping engine speed', () => {
  it('applies a speed multiplier through the player rate', async () => {
    const { engine, rates } = createFakes({ withShifter: false });

    await engine.setSpeedMultiplier(0.75);

    assert.deepEqual(rates, [0.75]);
    assert.deepEqual(engine.getState().speed, {
      kind: 'multiplier',
      multiplier: 0.75,
    });
  });

  it('rejects the modeled but unimplemented tempo map', async () => {
    const { engine, rates } = createFakes({ withShifter: false });

    await assert.rejects(
      engine.setSpeed({ kind: 'tempoMap', points: [] }),
      UnsupportedSpeedTransformError,
    );
    assert.deepEqual(rates, []);
  });

  it('rejects multipliers no player can honor', async () => {
    const { engine, rates } = createFakes({ withShifter: false });

    for (const multiplier of [0, -1, Number.NaN, Infinity]) {
      await assert.rejects(engine.setSpeedMultiplier(multiplier), RangeError);
    }

    assert.deepEqual(rates, []);
    assert.equal(engine.getState().speed.kind, 'multiplier');
  });
});

describe('playback shaping engine pitch where the platform cannot shift it', () => {
  it('reports canShapePitch false', () => {
    assert.equal(
      createFakes({ withShifter: false }).engine.canShapePitch,
      false,
    );
  });

  it('leaves speed and pitch state unchanged when pitch is requested', async () => {
    const { engine, rates } = createFakes({ withShifter: false });
    await engine.setSpeedMultiplier(0.8);
    const before = engine.getState();

    const result = await engine.setPitchSemitones(3);

    assert.deepEqual(result, { applied: false });
    assert.deepEqual(engine.getState(), before);
    // Pitch must never be approximated through the rate, which changes tempo.
    assert.deepEqual(rates, [0.8]);
  });
});

describe('playback shaping engine pitch where the platform can shift it', () => {
  it('applies whole semitones without touching the rate', async () => {
    const { engine, rates, semitones } = createFakes({ withShifter: true });

    const result = await engine.setPitchSemitones(-2);

    assert.equal(engine.canShapePitch, true);
    assert.deepEqual(result, { applied: true });
    assert.deepEqual(semitones, [-2]);
    assert.deepEqual(rates, []);
    assert.equal(engine.getState().pitchSemitones, -2);
  });

  it('rejects fractional semitones', async () => {
    const { engine, semitones } = createFakes({ withShifter: true });

    await assert.rejects(engine.setPitchSemitones(1.5), RangeError);
    assert.deepEqual(semitones, []);
  });

  it('resets speed and pitch to neutral', async () => {
    const { engine, rates, semitones } = createFakes({ withShifter: true });
    await engine.setSpeedMultiplier(0.6);
    await engine.setPitchSemitones(4);

    await engine.reset();

    assert.deepEqual(rates, [0.6, 1]);
    assert.deepEqual(semitones, [4, 0]);
    assert.equal(engine.getState().pitchSemitones, 0);
    assert.deepEqual(engine.getState().speed, {
      kind: 'multiplier',
      multiplier: 1,
    });
  });
});
