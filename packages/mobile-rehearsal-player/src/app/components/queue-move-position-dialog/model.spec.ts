/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { clampQueuePosition, resolveQueueMoveTargetIndex } from './model.js';

describe('queue move position helpers', () => {
  it('clamps one-based queue positions to the available bounds', () => {
    assert.equal(clampQueuePosition(-2, 4), 1);
    assert.equal(clampQueuePosition(3.4, 4), 3);
    assert.equal(clampQueuePosition(12, 4), 4);
  });

  it('maps slider values to bounded zero-based queue indexes', () => {
    assert.equal(
      resolveQueueMoveTargetIndex({ itemCount: 4, sliderValue: 1 }),
      0,
    );
    assert.equal(
      resolveQueueMoveTargetIndex({ itemCount: 4, sliderValue: [3] }),
      2,
    );
    assert.equal(
      resolveQueueMoveTargetIndex({ itemCount: 4, sliderValue: 9 }),
      3,
    );
  });
});
