/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPlaybackShapingSession } from './playback-shaping-session.js';
import { createPlaybackShapingEngine } from './playback-shaping-engine.js';

// Real engine over recording fakes: the session's contract is what ends up
// applied to the player and pitch shifter, and in which order.
const createSession = (options: { canShapePitch: boolean }) => {
  const rates: number[] = [];
  const semitones: number[] = [];
  const engine = createPlaybackShapingEngine({
    pitchShifter: options.canShapePitch
      ? { setSemitones: async (value) => void semitones.push(value) }
      : null,
    player: { setRate: async (rate) => void rates.push(rate) },
  });

  return { rates, semitones, session: createPlaybackShapingSession(engine) };
};

const WEB = { canShapePitch: true };
const NATIVE = { canShapePitch: false };

describe('ambient shaping before anything has loaded', () => {
  it('remembers settings without touching the player', async () => {
    const { rates, semitones, session } = createSession(WEB);

    await session.setSpeedMultiplier(0.8);
    await session.setPitchSemitones(2);

    assert.deepEqual(rates, []);
    assert.deepEqual(semitones, []);
    assert.deepEqual(session.getState().ambient, {
      pitchSemitones: 2,
      speedMultiplier: 0.8,
    });
  });

  it('applies them when the first item loads', async () => {
    const { rates, semitones, session } = createSession(WEB);
    await session.setSpeedMultiplier(0.8);
    await session.setPitchSemitones(2);

    await session.applyForLoadedItem();

    assert.deepEqual(rates, [0.8]);
    assert.deepEqual(semitones, [2]);
  });
});

describe('ambient shaping across items', () => {
  it('re-applies the ambient shaping after every load, as the player resets between items', async () => {
    const { rates, session } = createSession(WEB);
    await session.applyForLoadedItem();
    await session.setSpeedMultiplier(0.7);

    await session.applyForLoadedItem();
    await session.applyForLoadedItem();

    assert.deepEqual(rates, [1, 0.7, 0.7, 0.7]);
  });

  it('keeps the ambient shaping when playback stops, so only a reset or restart clears it', async () => {
    const { session } = createSession(WEB);
    await session.applyForLoadedItem();
    await session.setSpeedMultiplier(0.7);

    // Stopping or dismissing playback never calls into the session.
    assert.equal(session.getState().ambient.speedMultiplier, 0.7);
  });

  it('returns to neutral on a new user-initiated start', async () => {
    const { rates, semitones, session } = createSession(WEB);
    await session.applyForLoadedItem();
    await session.setSpeedMultiplier(0.7);
    await session.setPitchSemitones(-3);

    session.startNewPlayback();
    await session.applyForLoadedItem();

    assert.deepEqual(session.getState().ambient, {
      pitchSemitones: 0,
      speedMultiplier: 1,
    });
    assert.equal(rates.at(-1), 1);
    assert.equal(semitones.at(-1), 0);
  });

  it('resets on request and applies the neutral values to the player', async () => {
    const { rates, semitones, session } = createSession(WEB);
    await session.applyForLoadedItem();
    await session.setSpeedMultiplier(0.7);
    await session.setPitchSemitones(5);

    await session.reset();

    assert.equal(rates.at(-1), 1);
    assert.equal(semitones.at(-1), 0);
  });
});

describe('an item that carries its own transform', () => {
  it('applies for that item only and leaves the ambient shaping alone', async () => {
    const { rates, semitones, session } = createSession(WEB);
    await session.applyForLoadedItem();
    await session.setSpeedMultiplier(0.9);

    await session.applyForLoadedItem({
      pitchSemitones: 4,
      speedMultiplier: 0.6,
    });

    assert.deepEqual(session.getState().ambient, {
      pitchSemitones: 0,
      speedMultiplier: 0.9,
    });
    assert.deepEqual(session.getState().effective, {
      pitchSemitones: 4,
      speedMultiplier: 0.6,
    });
    assert.equal(session.getState().isItemTransformActive, true);
    assert.equal(rates.at(-1), 0.6);
    assert.equal(semitones.at(-1), 4);
  });

  it('restores the ambient shaping when playback moves to an item without a transform', async () => {
    const { rates, semitones, session } = createSession(WEB);
    await session.applyForLoadedItem();
    await session.setSpeedMultiplier(0.9);
    await session.applyForLoadedItem({
      pitchSemitones: 4,
      speedMultiplier: 0.6,
    });

    await session.applyForLoadedItem();

    assert.equal(session.getState().isItemTransformActive, false);
    assert.equal(rates.at(-1), 0.9);
    assert.equal(semitones.at(-1), 0);
  });
});

describe('clamping and platform limits', () => {
  it('clamps settings to the product ranges', async () => {
    const { session } = createSession(WEB);

    await session.setSpeedMultiplier(9);
    await session.setPitchSemitones(40);

    assert.deepEqual(session.getState().ambient, {
      pitchSemitones: 12,
      speedMultiplier: 2,
    });
  });

  it('never stores a pitch where the platform cannot shift it', async () => {
    const { rates, session } = createSession(NATIVE);
    await session.applyForLoadedItem();

    await session.setPitchSemitones(3);
    await session.setSpeedMultiplier(0.8);

    assert.equal(session.getState().canShapePitch, false);
    assert.deepEqual(session.getState().ambient, {
      pitchSemitones: 0,
      speedMultiplier: 0.8,
    });
    // Speed still applies; pitch never leaks into the rate.
    assert.deepEqual(rates, [1, 1, 0.8]);
  });
});

describe('subscribers', () => {
  it('are notified of changes and can unsubscribe', async () => {
    const { session } = createSession(WEB);
    let notifications = 0;
    const unsubscribe = session.subscribe(() => void (notifications += 1));

    await session.setSpeedMultiplier(0.8);
    session.startNewPlayback();
    unsubscribe();
    await session.setSpeedMultiplier(0.9);

    assert.equal(notifications, 2);
  });

  it('exposes a stable state object until something changes', async () => {
    const { session } = createSession(WEB);
    const before = session.getState();

    assert.equal(session.getState(), before);
    await session.setSpeedMultiplier(0.8);
    assert.notEqual(session.getState(), before);
  });
});
