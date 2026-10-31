import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { balanceToGains } from './balance-gains.ts';

describe('balanceToGains', () => {
  it('is all track at 0, all recording at 100, and both full at the centre', () => {
    assert.deepEqual(balanceToGains(0), { trackGain: 1, recordingGain: 0 });
    assert.deepEqual(balanceToGains(100), { trackGain: 0, recordingGain: 1 });
    assert.deepEqual(balanceToGains(50), { trackGain: 1, recordingGain: 1 });
  });

  it('turns only the far side down between the ends', () => {
    assert.deepEqual(balanceToGains(25), { trackGain: 1, recordingGain: 0.5 });
    assert.deepEqual(balanceToGains(75), { trackGain: 0.5, recordingGain: 1 });
  });

  it('clamps out-of-range values and falls back to the centre for NaN', () => {
    assert.deepEqual(balanceToGains(500), balanceToGains(100));
    assert.deepEqual(balanceToGains(-5), balanceToGains(0));
    assert.deepEqual(balanceToGains(Number.NaN), balanceToGains(50));
  });
});
