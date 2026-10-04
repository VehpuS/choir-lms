/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createCoalescedRunner } from './coalesced-runner.js';
import { createManualScheduler } from './manual-scheduler.js';

const setup = (options: { fail?: () => boolean } = {}) => {
  const { advance, scheduler } = createManualScheduler();
  const startedAt: number[] = [];
  let concurrent = 0;
  let maxConcurrent = 0;
  const run = async () => {
    startedAt.push(scheduler.now());
    concurrent += 1;
    maxConcurrent = Math.max(maxConcurrent, concurrent);
    await new Promise<void>((resolve) => setImmediate(resolve));
    concurrent -= 1;

    if (options.fail?.()) {
      throw new Error('run failed');
    }
  };

  return {
    advance,
    getMaxConcurrent: () => maxConcurrent,
    runner: createCoalescedRunner(run, { minIntervalMs: 100, scheduler }),
    startedAt,
  };
};

describe('coalesced runner', () => {
  it('runs the first request at once', async () => {
    const { runner, startedAt } = setup();

    await runner.request();

    assert.deepEqual(startedAt, [0]);
  });

  it('collapses a burst into one trailing run at the end of the interval', async () => {
    const { advance, runner, startedAt } = setup();
    const first = runner.request();
    await advance(10);
    const burst = [runner.request(), runner.request(), runner.request()];

    await advance(20);
    assert.deepEqual(startedAt, [0]);
    await advance(100);
    await Promise.all([first, ...burst]);

    assert.deepEqual(startedAt, [0, 130]);
  });

  it('never overlaps runs, even when requests arrive mid-run', async () => {
    const { advance, getMaxConcurrent, runner } = setup();

    const requests = [runner.request()];
    for (let i = 0; i < 5; i += 1) {
      await advance(30);
      requests.push(runner.request());
    }
    await advance(300);
    await Promise.all(requests);

    assert.equal(getMaxConcurrent(), 1);
  });

  it('runNow skips the interval but still waits for a run in flight', async () => {
    const { advance, getMaxConcurrent, runner, startedAt } = setup();
    const first = runner.request();
    const forced = runner.runNow();

    await advance(1);
    await Promise.all([first, forced]);

    assert.equal(getMaxConcurrent(), 1);
    assert.equal(startedAt.length, 2);
    assert.ok(startedAt[1] !== undefined && startedAt[1] <= 1);
  });

  it('rejects only the requests of a failed run and keeps working afterwards', async () => {
    let shouldFail = true;
    const { advance, runner } = setup({ fail: () => shouldFail });

    await assert.rejects(runner.request(), /run failed/);
    shouldFail = false;
    await advance(150);

    await runner.request();
  });
});
