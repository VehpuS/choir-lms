import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createFakeTimers, createFakeTransport } from './mixing-test-fakes.ts';
import { createPunchController } from './punch-controller.ts';
import type { PunchRange } from './punch-range.ts';

const RANGE: PunchRange = {
  inMs: 30_000,
  keepPlayingAfterOut: false,
  outMs: 40_000,
  preRollMs: 3_000,
};

type Call = string;

const setUp = (range: PunchRange = RANGE, rate = 1) => {
  const track = createFakeTransport({ playing: false, positionMs: 0 });
  const clock = createFakeTimers();
  const calls: Call[] = [];
  const controller = createPunchController({
    getRate: () => rate,
    playback: {
      // The fake player moves to where it is told, as the real one would.
      pause: () => {
        calls.push('pause');
        track.emit('pause', { playing: false });
      },
      play: () => {
        calls.push('play');
        track.emit('play', { playing: true });
      },
      seek: (ms) => {
        calls.push(`seek:${ms}`);
        track.emit('seek', { positionMs: ms });
      },
    },
    recorder: {
      start: () => calls.push('record'),
      stop: () => calls.push('stop-record'),
    },
    timers: clock.timers,
    transport: track.transport,
  });

  controller.arm(range);

  return { calls, clock, controller, track };
};

/** Moves the playing track and lets the poll see it. */
const playTo = (t: ReturnType<typeof setUp>, positionMs: number) => {
  t.track.move(positionMs);
  t.clock.tick();
};

describe('createPunchController', () => {
  it('arms and polls only while a punch is live', () => {
    const t = setUp();

    assert.equal(t.controller.getState().phase, 'armed');
    assert.equal(t.clock.isActive(), true);

    t.controller.stop();
    assert.equal(t.controller.getState().phase, 'disarmed');
    assert.equal(t.clock.isActive(), false);
  });

  it('plays from the pre-roll, counts down, records from In and stops at Out', () => {
    const t = setUp();

    t.controller.playFromPreRoll();
    assert.deepEqual(t.calls, ['seek:27000', 'play']);
    assert.equal(t.controller.getState().phase, 'countdown');
    assert.equal(t.controller.getState().countdownSeconds, 3);

    playTo(t, 29_000);
    assert.equal(t.controller.getState().countdownSeconds, 1);

    playTo(t, 30_020);
    assert.equal(t.controller.getState().phase, 'recording');
    assert.equal(t.calls.filter((call) => call === 'record').length, 1);

    playTo(t, 35_000);
    assert.equal(t.controller.getState().remainingMs, 5_000);

    playTo(t, 40_010);
    assert.equal(t.controller.getState().phase, 'stopped-at-out');
    assert.deepEqual(t.calls.slice(-2), ['stop-record', 'pause']);
    assert.equal(t.clock.isActive(), false);
  });

  it('sends a plain play from the wrong place to the pre-roll', () => {
    const t = setUp();

    t.track.emit('play', { playing: true, positionMs: 5_000 });

    assert.deepEqual(t.calls, ['seek:27000']);
  });

  it('Stop during recording ends it at once and keeps what was captured', () => {
    const t = setUp();

    t.controller.playFromPreRoll();
    playTo(t, 30_020);
    playTo(t, 33_000);
    t.controller.stop();

    assert.equal(t.controller.getState().phase, 'stopped-early');
    assert.equal(t.calls.at(-1), 'stop-record');
    assert.equal(t.calls.includes('pause'), false);
  });

  it('keeps recording through a pause and resume, and stops when the track later reaches Out', () => {
    const t = setUp();

    t.controller.playFromPreRoll();
    playTo(t, 30_020);
    playTo(t, 31_000);
    t.track.emit('pause', { playing: false });
    assert.equal(t.controller.getState().phase, 'recording');

    t.track.emit('play', { playing: true });
    playTo(t, 40_000);
    assert.equal(t.controller.getState().phase, 'stopped-at-out');
  });

  it('records one pass of a loop and stops when the loop wraps', () => {
    const t = setUp({
      ...RANGE,
      loop: { endMs: 40_000, id: 'l', name: 'Loop', startMs: 30_000 },
    });

    t.controller.playFromPreRoll();
    playTo(t, 30_020);
    playTo(t, 39_960);
    t.track.emit('loop', { positionMs: 30_000 });

    assert.equal(t.controller.getState().phase, 'stopped-at-out');
  });

  it('counts down at the track’s speed', () => {
    const t = setUp(RANGE, 0.5);

    t.controller.playFromPreRoll();
    playTo(t, 28_500);

    assert.equal(t.controller.getState().countdownSeconds, 3);
  });

  it('tells subscribers of each change, and not after dispose', () => {
    const t = setUp();
    let changes = 0;

    t.controller.subscribe(() => {
      changes += 1;
    });
    t.controller.playFromPreRoll();
    playTo(t, 30_020);
    const before = changes;

    t.controller.dispose();
    playTo(t, 40_000);

    assert.ok(before >= 2);
    assert.equal(changes, before);
    assert.equal(t.track.listenerCount(), 0);
    assert.equal(t.clock.isActive(), false);
  });
});
