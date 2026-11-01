import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toWallMs } from './pcm-source.web.js';

const contextWith = (
  stamp: { contextTime?: number; performanceTime?: number } | undefined,
) => ({ getOutputTimestamp: () => stamp }) as Parameters<typeof toWallMs>[0];

describe('toWallMs', () => {
  it('maps a capture time onto performance.now() through the output stamp', () => {
    const wall = toWallMs(
      contextWith({ contextTime: 10, performanceTime: 50_000 }),
      10.25,
    );

    assert.equal(wall, 50_250);
  });

  it('has no answer when the context reports no stamp', () => {
    assert.equal(toWallMs(contextWith(undefined), 1), undefined);
  });

  it('has no answer while the output clock has not started (a zero stamp)', () => {
    // A fresh context reports { contextTime: 0, performanceTime: 0 }; taking it
    // at face value put the first block near time zero, far from the track
    // transport's clock, and the timeline began at track position 0.
    assert.equal(
      toWallMs(contextWith({ contextTime: 0, performanceTime: 0 }), 0.4),
      undefined,
    );
  });
});
