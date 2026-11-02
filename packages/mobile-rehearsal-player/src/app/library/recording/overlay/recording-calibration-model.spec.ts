import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  describeMeasured,
  phaseFromOutcome,
} from './recording-calibration-model.js';

describe('recording calibration model', () => {
  it('shows the measurement and where it was saved', () => {
    assert.deepEqual(phaseFromOutcome({ kind: 'measured', latencyMs: 74 }), {
      kind: 'ok',
      latencyMs: 74,
    });
    assert.equal(
      describeMeasured(74, 'AirPods'),
      'Measured 74 ms for this output. Saved as the default for “AirPods”. Existing recordings keep what they were recorded with.',
    );
  });

  it('points to the manual control when the clicks are not heard', () => {
    const phase = phaseFromOutcome({ kind: 'failed', reason: 'not-heard' });

    assert.equal(phase.kind, 'failed');
    assert.ok(
      phase.kind === 'failed' &&
        phase.message.includes('not heard') &&
        phase.message.includes('previous value is unchanged'),
    );
  });

  it('gives every failure a message that leaves the old value alone or points to Sync', () => {
    (
      [
        'not-heard',
        'inconsistent',
        'no-clock',
        'denied',
        'unavailable',
        'in-use',
      ] as const
    ).forEach((reason) => {
      const phase = phaseFromOutcome({ kind: 'failed', reason });

      assert.ok(
        phase.kind === 'failed' && /Sync|try again/.test(phase.message),
      );
    });
  });

  it('returns to the start when cancelled', () => {
    assert.deepEqual(phaseFromOutcome({ kind: 'cancelled' }), {
      kind: 'intro',
    });
  });
});
