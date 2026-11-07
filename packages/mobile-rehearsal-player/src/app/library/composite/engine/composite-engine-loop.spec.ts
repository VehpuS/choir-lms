import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ENGINE_START_LEAD_S } from './composite-engine.js';
import { setup, starts } from './composite-engine-test-fakes.js';

describe('composite engine loop', () => {
  it('schedules the wrap ahead of the loop end and starts the stems over at its start', () => {
    const { engine, fake, log, manual } = setup([
      { id: 's', offsetMs: 0, durationMs: 60_000 },
      { id: 'a', offsetMs: 0, durationMs: 61_000 },
    ]);

    engine.setLoop({ startMs: 10_000, endMs: 20_000 });
    engine.seek(18_000);
    engine.play();

    const anchor = fake.clock.currentTime + ENGINE_START_LEAD_S;
    const endsAt = anchor + 2;

    // Far from the end: nothing is scheduled yet.
    fake.clock.currentTime = anchor + 1;
    manual.tick();
    assert.equal(starts(log).length, 2);

    // Within the lookahead: both stems are restarted for the loop end.
    fake.clock.currentTime = anchor + 1.7;
    manual.tick();

    const wraps = starts(log).slice(2);

    assert.equal(wraps.length, 2);
    for (const call of wraps) {
      assert.equal(call.args[0], 10_000);
      assert.ok(Math.abs((call.args[1] as number) - endsAt) < 1e-9);
    }
  });

  it('keeps the position continuous across the wrap and notifies once it has happened', () => {
    const { engine, fake, manual } = setup([
      { id: 's', offsetMs: 0, durationMs: 60_000 },
    ]);
    let notified = 0;

    engine.setLoop({ startMs: 10_000, endMs: 20_000 });
    engine.seek(18_000);
    engine.play();

    const anchor = fake.clock.currentTime + ENGINE_START_LEAD_S;

    fake.clock.currentTime = anchor + 1.7;
    manual.tick();
    engine.subscribe(() => (notified += 1));

    // Still before the loop end the position keeps climbing...
    fake.clock.currentTime = anchor + 1.9;
    assert.equal(Math.round(engine.getPositionMs()), 19_900);

    // ...and after it the position is back at the loop start.
    fake.clock.currentTime = anchor + 2.5;
    manual.tick();
    assert.equal(Math.round(engine.getPositionMs()), 10_500);
    assert.equal(notified, 1);
  });

  it('wraps again on the next pass', () => {
    const { engine, fake, log, manual } = setup([
      { id: 's', offsetMs: 0, durationMs: 60_000 },
    ]);

    engine.setLoop({ startMs: 10_000, endMs: 12_000 });
    engine.seek(10_000);
    engine.play();

    const anchor = fake.clock.currentTime + ENGINE_START_LEAD_S;

    fake.clock.currentTime = anchor + 1.8;
    manual.tick();
    fake.clock.currentTime = anchor + 2.1;
    manual.tick();
    fake.clock.currentTime = anchor + 3.8;
    manual.tick();

    assert.equal(starts(log).length, 3);
    assert.ok(
      Math.abs((starts(log)[2].args[1] as number) - (anchor + 4)) < 1e-9,
    );
  });

  it('follows the rate: a loop at half speed takes twice as long in context time', () => {
    const { engine, fake, log, manual } = setup([
      { id: 's', offsetMs: 0, durationMs: 60_000 },
    ]);

    engine.setRate(0.5);
    engine.setLoop({ startMs: 0, endMs: 4_000 });
    engine.play();

    const anchor = fake.clock.currentTime + ENGINE_START_LEAD_S;

    fake.clock.currentTime = anchor + 7.8;
    manual.tick();

    assert.ok(
      Math.abs((starts(log).at(-1)?.args[1] as number) - (anchor + 8)) < 1e-9,
    );
  });

  it('starts over at once when the position is already past the loop end', () => {
    const { engine, log, manual } = setup([
      { id: 's', offsetMs: 0, durationMs: 60_000 },
    ]);

    engine.seek(30_000);
    engine.play();
    engine.setLoop({ startMs: 10_000, endMs: 20_000 });
    manual.tick();

    assert.equal(starts(log).at(-1)?.args[0], 10_000);
  });

  it('stops wrapping when the loop is cleared and ignores an empty range', () => {
    const { engine, fake, log, manual } = setup([
      { id: 's', offsetMs: 0, durationMs: 60_000 },
    ]);

    engine.setLoop({ startMs: 5_000, endMs: 5_000 });
    assert.equal(engine.getLoop(), null);

    engine.setLoop({ startMs: 0, endMs: 2_000 });
    engine.setLoop(null);
    engine.play();
    fake.clock.currentTime += ENGINE_START_LEAD_S + 1.8;
    manual.tick();

    assert.equal(starts(log).length, 1);
  });
});
