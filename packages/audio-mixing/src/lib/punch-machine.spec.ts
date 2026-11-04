import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  IDLE_PUNCH,
  PUNCH_START_TOLERANCE_MS,
  stepPunch,
  type PunchEffect,
  type PunchEvent,
  type PunchState,
} from './punch-machine.ts';
import type { PunchRange } from './punch-range.ts';

const RANGE: PunchRange = {
  inMs: 30_000,
  keepPlayingAfterOut: false,
  outMs: 40_000,
  preRollMs: 3_000,
};
const tick = (positionMs: number, playing = true, rate = 1): PunchEvent => ({
  playing,
  positionMs,
  rate,
  type: 'tick',
});

/** Feeds events in order, returning the final state and every effect in order. */
const run = (events: PunchEvent[], start: PunchState = IDLE_PUNCH) => {
  const effects: PunchEffect[] = [];
  let state = start;

  for (const event of events) {
    const step = stepPunch(state, event);

    state = step.state;
    effects.push(...step.effects);
  }

  return { effects, state };
};

const armed = (range = RANGE) => run([{ range, type: 'arm' }]).state;

describe('stepPunch', () => {
  it('arms from idle and from a finished punch, but not while one is live', () => {
    assert.equal(armed().phase, 'armed');
    assert.equal(
      run([{ range: RANGE, type: 'arm' }], {
        phase: 'stopped-at-out',
        range: RANGE,
      }).state.phase,
      'armed',
    );
    assert.equal(
      run([{ range: { ...RANGE, inMs: 5_000 }, type: 'arm' }], armed()).state
        .range?.inMs,
      30_000,
    );
  });

  it('ignores everything but arm and reset while idle', () => {
    assert.deepEqual(
      run([tick(30_000), { type: 'stop' }, { type: 'play', positionMs: 0 }])
        .state,
      IDLE_PUNCH,
    );
  });

  describe('getting to the in point', () => {
    it('goes to the pre-roll and plays on Play from pre-roll', () => {
      assert.deepEqual(run([{ type: 'play-from-pre-roll' }], armed()).effects, [
        { ms: 27_000, type: 'seek' },
        { type: 'play' },
      ]);
    });

    it('sends a play from outside the pre-roll to the pre-roll, and leaves one inside it alone', () => {
      assert.deepEqual(
        run([{ positionMs: 5_000, type: 'play' }], armed()).effects,
        [{ ms: 27_000, type: 'seek' }],
      );
      assert.deepEqual(
        run([{ positionMs: 35_000, type: 'play' }], armed()).effects,
        [{ ms: 27_000, type: 'seek' }],
      );
      assert.deepEqual(
        run([{ positionMs: 28_000, type: 'play' }], armed()).effects,
        [],
      );
    });

    it('counts down in whole seconds while the pre-roll plays, at the track’s speed', () => {
      assert.equal(run([tick(27_500)], armed()).state.countdownSeconds, 3);
      assert.equal(run([tick(29_100)], armed()).state.countdownSeconds, 1);
      // At half speed 1.5 track seconds take 3 seconds of the clock.
      assert.equal(
        run([tick(28_500, true, 0.5)], armed()).state.countdownSeconds,
        3,
      );
      assert.equal(run([tick(28_500)], armed()).state.phase, 'countdown');
    });

    it('goes back to armed when playback pauses during the countdown or plays outside the pre-roll', () => {
      assert.equal(
        run([tick(28_000), tick(28_100, false)], armed()).state.phase,
        'armed',
      );
      assert.equal(run([tick(10_000)], armed()).state.phase, 'armed');
    });

    it('starts recording when playback reaches In, once', () => {
      const result = run([tick(29_900), tick(30_020), tick(30_070)], armed());

      assert.deepEqual(result.effects, [{ type: 'start-recording' }]);
      assert.equal(result.state.phase, 'recording');
    });

    it('does not start a take that began past In', () => {
      const result = run(
        [tick(30_000 + PUNCH_START_TOLERANCE_MS + 1)],
        armed(),
      );

      assert.equal(result.state.phase, 'armed');
      assert.deepEqual(result.effects, []);
    });
  });

  describe('a late poll after the countdown', () => {
    it('still starts the take, since the pre-roll was heard first', () => {
      const result = run([tick(28_500), tick(31_200)], armed());

      assert.deepEqual(result.effects, [{ type: 'start-recording' }]);
      assert.equal(result.state.phase, 'recording');
    });

    it('does not start one past Out', () => {
      const result = run([tick(28_500), tick(41_000)], armed());

      assert.equal(result.state.phase, 'armed');
      assert.deepEqual(result.effects, []);
    });
  });

  describe('recording between In and Out', () => {
    const recording = () => run([tick(30_020)], armed()).state;

    it('shows the time left until Out, at the track’s speed', () => {
      assert.equal(run([tick(35_000)], recording()).state.remainingMs, 5_000);
      assert.equal(
        run([tick(35_000, true, 0.5)], recording()).state.remainingMs,
        10_000,
      );
    });

    it('keeps the time left while the track is paused', () => {
      const paused = run(
        [tick(35_000), tick(35_000, false)],
        recording(),
      ).state;

      assert.equal(paused.phase, 'recording');
      assert.equal(paused.remainingMs, 5_000);
    });

    it('stops at Out and pauses playback unless it should keep playing', () => {
      assert.deepEqual(run([tick(40_000)], recording()).effects, [
        { type: 'stop-recording' },
        { type: 'pause' },
      ]);
      assert.equal(
        run([tick(40_000)], recording()).state.phase,
        'stopped-at-out',
      );

      const keep = armed({ ...RANGE, keepPlayingAfterOut: true });

      assert.deepEqual(run([tick(30_020), tick(41_000)], keep).effects, [
        { type: 'start-recording' },
        { type: 'stop-recording' },
      ]);
    });

    it('stops at Out when a seek lands past it, and ignores a seek back before In', () => {
      assert.equal(
        run([tick(55_000)], recording()).state.phase,
        'stopped-at-out',
      );
      assert.equal(run([tick(5_000)], recording()).state.phase, 'recording');
    });

    it('records one pass of a loop and stops when the loop wraps', () => {
      const looped = armed({
        ...RANGE,
        loop: { endMs: 40_000, id: 'l', name: 'Loop', startMs: 30_000 },
      });
      const result = run(
        [tick(30_020), tick(39_950), { type: 'loop-wrap' }],
        looped,
      );

      assert.equal(result.state.phase, 'stopped-at-out');
      assert.deepEqual(result.effects.slice(-2), [
        { type: 'stop-recording' },
        { type: 'pause' },
      ]);
    });

    it('ignores a loop wrap that is not the range’s own loop', () => {
      assert.equal(
        run([{ type: 'loop-wrap' }], recording()).state.phase,
        'recording',
      );
    });
  });

  describe('stopping early', () => {
    it('Stop or Disarm before recording disarms, and records nothing', () => {
      const result = run([tick(28_000), { type: 'stop' }], armed());

      assert.equal(result.state.phase, 'disarmed');
      assert.deepEqual(result.effects, []);
    });

    it('Stop during recording ends it at once and keeps what was captured', () => {
      const result = run(
        [tick(30_020), tick(33_000), { type: 'stop' }],
        armed(),
      );

      assert.equal(result.state.phase, 'stopped-early');
      assert.deepEqual(result.effects, [
        { type: 'start-recording' },
        { type: 'stop-recording' },
      ]);
    });
  });

  it('ignores events once a punch has finished, until it is reset or armed again', () => {
    const done = run([tick(30_020), tick(41_000)], armed()).state;

    assert.deepEqual(run([tick(35_000), { type: 'stop' }], done).effects, []);
    assert.equal(run([{ type: 'reset' }], done).state.phase, 'idle');
    assert.equal(
      run([{ range: RANGE, type: 'arm' }], done).state.phase,
      'armed',
    );
  });
});
