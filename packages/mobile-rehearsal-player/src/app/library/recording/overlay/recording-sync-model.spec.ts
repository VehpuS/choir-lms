import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canUseNudgeForDevice,
  deviceLatencyFromNudge,
  formatNudge,
  stepNudge,
} from './recording-sync-model.js';

describe('recording sync model', () => {
  it('steps by 1 and 10 ms and stays inside plus or minus 250', () => {
    assert.equal(stepNudge(0, 10), 10);
    assert.equal(stepNudge(10, -1), 9);
    assert.equal(stepNudge(245, 10), 250);
    assert.equal(stepNudge(-245, -10), -250);
  });

  it('writes the nudge with its sign', () => {
    assert.equal(formatNudge(12), '+12 ms');
    assert.equal(formatNudge(-5), '−5 ms');
    assert.equal(formatNudge(0), '0 ms');
  });

  it('files the next take with the compensation the nudge showed was right', () => {
    // Plays 20 ms later than filed: the take had 20 ms too much compensation.
    assert.equal(
      deviceLatencyFromNudge({ appliedLatencyMs: 100, nudgeMs: 0 }, 20),
      80,
    );
    assert.equal(
      deviceLatencyFromNudge({ appliedLatencyMs: 100, nudgeMs: 0 }, -30),
      130,
    );
  });

  it('uses the recording’s own nudge by default and keeps the result in range', () => {
    assert.equal(
      deviceLatencyFromNudge({ appliedLatencyMs: 0, nudgeMs: 40 }),
      -40,
    );
    assert.equal(
      deviceLatencyFromNudge({ appliedLatencyMs: 0, nudgeMs: 250 }),
      -250,
    );
    assert.equal(
      deviceLatencyFromNudge({ appliedLatencyMs: 900, nudgeMs: -250 }),
      1000,
    );
  });

  it('offers to save only when it would change the device default', () => {
    const recording = { appliedLatencyMs: 50, nudgeMs: 0 };

    assert.equal(canUseNudgeForDevice(recording, 0, null), true);
    assert.equal(canUseNudgeForDevice(recording, 0, 50), false);
    assert.equal(canUseNudgeForDevice(recording, 10, 50), true);
    assert.equal(
      canUseNudgeForDevice({ appliedLatencyMs: 0, nudgeMs: 0 }, 0, null),
      false,
    );
  });
});
