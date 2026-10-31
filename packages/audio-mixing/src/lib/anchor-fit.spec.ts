import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  fitClockAnchors,
  splitStretches,
  type ClockAnchor,
} from './anchor-fit.ts';

// Deterministic jitter so the spec does not depend on a random source.
const jitter = (i: number) => ((i * 7) % 5) - 2;

const sampleAnchors = (
  rate: number,
  offsetMs: number,
  count: number,
): ClockAnchor[] => {
  return Array.from({ length: count }, (_, i) => {
    const wallMs = 1_000_000 + i * 25;

    return {
      wallMs,
      trackMs: offsetMs + rate * (wallMs - 1_000_000) + jitter(i),
    };
  });
};

describe('fitClockAnchors', () => {
  it('recovers the offset to within a millisecond with a known rate', () => {
    const fit = fitClockAnchors(sampleAnchors(0.7, 30_000, 40), 0.7);

    assert.ok(fit);
    assert.ok(Math.abs(fit.trackAt(1_000_500) - (30_000 + 0.7 * 500)) < 1);
  });

  it('recovers the rate when it is not given', () => {
    const fit = fitClockAnchors(sampleAnchors(1.3, 0, 60));

    assert.ok(fit);
    assert.ok(Math.abs(fit.slope - 1.3) < 0.01);
  });

  it('extrapolates outside the sampled window', () => {
    const fit = fitClockAnchors(sampleAnchors(1, 1000, 20), 1);

    assert.ok(fit);
    assert.ok(Math.abs(fit.trackAt(1_002_000) - 3000) < 1);
  });

  it('returns null with nothing to fit, or one anchor and a free slope', () => {
    assert.equal(fitClockAnchors([]), null);
    assert.equal(fitClockAnchors([{ wallMs: 1, trackMs: 1 }]), null);
    assert.ok(fitClockAnchors([{ wallMs: 1, trackMs: 1 }], 1));
  });
});

describe('splitStretches', () => {
  it('starts a new stretch at a seek and at a loop wrap', () => {
    const anchors: ClockAnchor[] = [
      { wallMs: 0, trackMs: 1000 },
      { wallMs: 25, trackMs: 1025 },
      { wallMs: 50, trackMs: 9000 },
      { wallMs: 75, trackMs: 9025 },
      { wallMs: 100, trackMs: 1000 },
    ];

    assert.deepEqual(
      splitStretches(anchors, 1, 20).map((stretch) => stretch.length),
      [2, 2, 1],
    );
  });

  it('keeps small jitter in one stretch', () => {
    assert.equal(splitStretches(sampleAnchors(1, 0, 30), 1, 20).length, 1);
  });
});
