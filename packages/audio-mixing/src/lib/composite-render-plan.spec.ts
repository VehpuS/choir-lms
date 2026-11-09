import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  estimateCompositeWavBytes,
  planCompositeRender,
} from './composite-render-plan.ts';

const NO_SHAPING = { rate: 1, pitchSemitones: 0 };

describe('planCompositeRender', () => {
  it('runs to the longest stem end, counting offsets', () => {
    const plan = planCompositeRender(
      [
        { offsetMs: 0, durationMs: 2000 },
        { offsetMs: 500, durationMs: 2000 },
      ],
      NO_SHAPING,
      1000,
    );

    assert.equal(plan.timelineMs, 2500);
    assert.equal(plan.totalFrames, 2500);
  });

  it('stretches the length by the speed', () => {
    const slow = planCompositeRender(
      [{ offsetMs: 0, durationMs: 2000 }],
      { rate: 0.5, pitchSemitones: 0 },
      1000,
    );
    const fast = planCompositeRender(
      [{ offsetMs: 0, durationMs: 2000 }],
      { rate: 2, pitchSemitones: 2 },
      1000,
    );

    assert.equal(slow.outputDurationMs, 4000);
    assert.equal(fast.totalFrames, 1000);
  });

  it('ignores the trimmed start of a negative offset and a stem that ends before zero', () => {
    const plan = planCompositeRender(
      [
        { offsetMs: -500, durationMs: 2000 },
        { offsetMs: -3000, durationMs: 1000 },
      ],
      NO_SHAPING,
      1000,
    );

    assert.equal(plan.timelineMs, 1500);
  });

  it('is empty without stems', () => {
    assert.equal(planCompositeRender([], NO_SHAPING, 44_100).totalFrames, 0);
  });
});

describe('estimateCompositeWavBytes', () => {
  it('counts a 44-byte header and two bytes per mono frame', () => {
    assert.equal(estimateCompositeWavBytes({ totalFrames: 100 }), 244);
  });
});
