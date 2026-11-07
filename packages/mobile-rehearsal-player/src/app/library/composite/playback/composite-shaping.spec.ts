import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { createPlaybackShapingEngine } from '../../playback/shaping/playback-shaping-engine';
import {
  clearActiveCompositeEngine,
  getActiveCompositeEngine,
  setActiveCompositeEngine,
} from './active-composite.js';
import { createCompositeAwarePlayer } from './composite-aware-player.js';
import { wrapPitchShifterForComposite } from './composite-aware-pitch-shifter.js';
import { createTestEngine } from './composite-test-engine.js';

afterEach(() => clearActiveCompositeEngine());

const STATES = { Ended: 'e', Paused: 'p', Playing: 'l' } as const;

/** The shaping engine over the same wrappers the app builds, with a recording media element. */
const setup = () => {
  const element = { rates: [] as number[], semitones: [] as number[] };
  const player = createCompositeAwarePlayer(
    {
      setRate: async (rate: number) => void element.rates.push(rate),
      reset: async () => undefined,
    },
    {
      getActiveEngine: getActiveCompositeEngine,
      clearActiveEngine: clearActiveCompositeEngine,
      states: STATES,
    },
  );
  const shaping = createPlaybackShapingEngine({
    player,
    pitchShifter: wrapPitchShifterForComposite(
      { setSemitones: async (s) => void element.semitones.push(s) },
      getActiveCompositeEngine,
    ),
  });

  return { element, shaping };
};

describe('shaping a composite', () => {
  it('sends speed and pitch to the active engine and not to the media element', async () => {
    const { element, shaping } = setup();
    const test = createTestEngine();

    setActiveCompositeEngine(test.engine);
    await shaping.setSpeedMultiplier(0.7);
    await shaping.setPitchSemitones(-2);

    assert.deepEqual(test.calls, [
      ['setRate', 0.7],
      ['setPitchSemitones', -2],
    ]);
    assert.deepEqual(element, { rates: [], semitones: [] });
    assert.deepEqual(shaping.getState().pitchSemitones, -2);
  });

  it('shapes the media element again once no composite is active', async () => {
    const { element, shaping } = setup();

    await shaping.setSpeedMultiplier(1.3);
    await shaping.setPitchSemitones(2);

    assert.deepEqual(element, { rates: [1.3], semitones: [2] });
  });

  it('still reports that pitch can be shaped, so the pitch control stays enabled', () => {
    assert.equal(setup().shaping.canShapePitch, true);
  });

  it('has no pitch shifter where the platform has none', () => {
    assert.equal(
      wrapPitchShifterForComposite(null, () => null),
      null,
    );
  });

  it('resets to neutral on the engine', async () => {
    const { shaping } = setup();
    const test = createTestEngine();

    setActiveCompositeEngine(test.engine);
    await shaping.reset();

    assert.deepEqual(test.calls, [
      ['setRate', 1],
      ['setPitchSemitones', 0],
    ]);
  });
});
