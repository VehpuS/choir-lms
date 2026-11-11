import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createIdleTimer, type TimerScheduler } from './idle-timer.js';

// A hand-driven scheduler: nothing runs until the test calls `advance`.
const fakeScheduler = () => {
  let now = 0;
  let nextId = 0;
  const pending = new Map<number, { at: number; run: () => void }>();
  const scheduler: TimerScheduler<number> = {
    clear: (id) => {
      pending.delete(id);
    },
    set: (run, delayMs) => {
      nextId += 1;
      pending.set(nextId, { at: now + delayMs, run });

      return nextId;
    },
  };
  const advance = (ms: number) => {
    now += ms;
    [...pending.entries()]
      .filter(([, timer]) => timer.at <= now)
      .forEach(([id, timer]) => {
        pending.delete(id);
        timer.run();
      });
  };

  return { advance, pending, scheduler };
};

describe('createIdleTimer', () => {
  it('calls onIdle once after the delay with no touch', () => {
    const { advance, scheduler } = fakeScheduler();
    let idle = 0;

    createIdleTimer(4000, () => (idle += 1), scheduler);
    advance(3999);
    assert.equal(idle, 0);
    advance(1);
    assert.equal(idle, 1);
    advance(10_000);
    assert.equal(idle, 1);
  });

  it('restarts the countdown on every touch', () => {
    const { advance, scheduler } = fakeScheduler();
    let idle = 0;
    const timer = createIdleTimer(4000, () => (idle += 1), scheduler);

    advance(3000);
    timer.touch();
    advance(3000);
    assert.equal(idle, 0);
    advance(1000);
    assert.equal(idle, 1);
  });

  it('does not call onIdle after stop', () => {
    const { advance, pending, scheduler } = fakeScheduler();
    let idle = 0;
    const timer = createIdleTimer(4000, () => (idle += 1), scheduler);

    timer.stop();
    advance(10_000);
    assert.equal(idle, 0);
    assert.equal(pending.size, 0);
  });
});
