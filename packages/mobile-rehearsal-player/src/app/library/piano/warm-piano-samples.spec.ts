import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  startPianoWarmup,
  type PianoWarmupEnvironment,
} from './warm-piano-samples';

const createEnvironment = (canSpendData = true) => {
  const calls = { warmed: 0, cancelled: 0 };
  let pendingCallback: (() => void) | null = null;
  const environment: PianoWarmupEnvironment = {
    canSpendData: () => canSpendData,
    warm: () => {
      calls.warmed += 1;
    },
    whenIdle: (callback) => {
      pendingCallback = callback;

      return () => {
        calls.cancelled += 1;
        pendingCallback = null;
      };
    },
  };

  return { calls, environment, runIdle: () => pendingCallback?.() };
};

describe('startPianoWarmup', () => {
  it('waits for idle, then fetches the recordings', () => {
    const { calls, environment, runIdle } = createEnvironment();

    startPianoWarmup(environment);
    assert.equal(calls.warmed, 0);

    runIdle();
    assert.equal(calls.warmed, 1);
  });

  it('spends no data when the person asked to save it', () => {
    const { calls, environment, runIdle } = createEnvironment(false);

    startPianoWarmup(environment);
    runIdle();

    assert.equal(calls.warmed, 0);
  });

  it('can be cancelled before it runs', () => {
    const { calls, environment, runIdle } = createEnvironment();

    startPianoWarmup(environment)();
    runIdle();

    assert.equal(calls.cancelled, 1);
    assert.equal(calls.warmed, 0);
  });
});
