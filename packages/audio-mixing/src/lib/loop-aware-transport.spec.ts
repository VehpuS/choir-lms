import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLoopAwareTransport,
  isLoopWrap,
} from './loop-aware-transport.ts';
import { createFakeTransport } from './mixing-test-fakes.ts';
import type { SyncTimers, TransportEvent } from './sync-controller.ts';

const RANGE = { startMs: 50_000, endMs: 70_000 };

const createManualTimers = () => {
  let callback: (() => void) | null = null;
  const timers: SyncTimers = {
    setInterval: (cb) => {
      callback = cb;

      return 1;
    },
    clearInterval: () => {
      callback = null;
    },
  };

  return {
    timers,
    tick: () => callback?.(),
    isRunning: () => callback !== null,
  };
};

describe('isLoopWrap', () => {
  it('is a wrap when playback leaves near the end and lands near the start', () => {
    assert.equal(
      isLoopWrap({ previousMs: 69_800, currentMs: 50_000, range: RANGE }),
      true,
    );
  });

  it('is not a wrap when the user seeks from the middle back to the start', () => {
    assert.equal(
      isLoopWrap({ previousMs: 60_000, currentMs: 50_000, range: RANGE }),
      false,
    );
  });

  it('is not a wrap when the jump lands in the middle of the loop', () => {
    assert.equal(
      isLoopWrap({ previousMs: 69_900, currentMs: 60_000, range: RANGE }),
      false,
    );
  });

  it('is not a wrap when the position moves forward', () => {
    assert.equal(
      isLoopWrap({ previousMs: 50_100, currentMs: 69_900, range: RANGE }),
      false,
    );
  });
});

describe('loop-aware transport', () => {
  const setup = (position: number) => {
    const fake = createFakeTransport({ positionMs: position, playing: true });
    const manual = createManualTimers();
    const wrapped = createLoopAwareTransport({
      transport: fake.transport,
      range: RANGE,
      timers: manual.timers,
    });
    const events: TransportEvent[] = [];

    wrapped.subscribe((event) => events.push(event));

    return { fake, manual, wrapped, events };
  };

  it('reports a repeat of the loop as a loop, not a seek', () => {
    const { events, fake, manual } = setup(55_000);

    fake.move(69_800);
    manual.tick();
    fake.move(50_000);
    fake.emit('seek');

    assert.deepEqual(events, ['loop']);
  });

  it('reports a user seek inside the loop as a seek', () => {
    const { events, fake, manual } = setup(55_000);

    fake.move(60_000);
    manual.tick();
    fake.move(52_000);
    fake.emit('seek');

    assert.deepEqual(events, ['seek']);
  });

  it('counts every pass, not only the first', () => {
    const { events, fake, manual } = setup(50_000);

    [1, 2].forEach(() => {
      fake.move(69_900);
      manual.tick();
      fake.move(50_000);
      fake.emit('seek');
    });

    assert.deepEqual(events, ['loop', 'loop']);
  });

  it('still sees a wrap when the position jumped before the seek event arrived', () => {
    const { events, fake, manual } = setup(55_000);

    fake.move(69_800);
    manual.tick();
    // The player already reports the new position while the seek is in flight,
    // and the sampler runs before `seeked` is delivered.
    fake.move(50_000);
    manual.tick();
    fake.emit('seek');

    assert.deepEqual(events, ['loop']);
  });

  it('does not take a backward jump from the sampler for a place the track was', () => {
    const { events, fake, manual } = setup(55_000);

    fake.move(60_000);
    manual.tick();
    fake.move(52_000);
    manual.tick();
    fake.emit('seek');

    // A seek from the middle of the loop, so not a wrap.
    assert.deepEqual(events, ['seek']);
  });

  it('passes play and pause through unchanged', () => {
    const { events, fake } = setup(55_000);

    fake.emit('pause', { playing: false });
    fake.emit('play', { playing: true });

    assert.deepEqual(events, ['pause', 'play']);
  });

  it('forgets the old position after a pause, so a later seek is judged fresh', () => {
    const { events, fake, manual } = setup(69_900);

    manual.tick();
    fake.move(65_000);
    fake.emit('pause', { playing: false });
    fake.move(50_000);
    fake.emit('seek');

    assert.deepEqual(events, ['pause', 'seek']);
  });

  it('reads position and playing state from the transport', () => {
    const { fake, wrapped } = setup(55_000);

    fake.move(58_000);

    assert.equal(wrapped.getPositionMs(), 58_000);
    assert.equal(wrapped.isPlaying(), true);
  });

  it('stops sampling when disposed', () => {
    const { manual, wrapped } = setup(55_000);

    wrapped.dispose();

    assert.equal(manual.isRunning(), false);
  });
});
