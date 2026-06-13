/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getQueueListMaxHeight } from './queue-surface-layout.js';

describe('queue surface layout', () => {
  it('keeps the queue list tall enough on compact screens', () => {
    assert.equal(getQueueListMaxHeight(480), 220);
  });

  it('caps the queue list height on taller screens', () => {
    assert.equal(getQueueListMaxHeight(1200), 320);
  });

  it('falls back to the minimum height when window size is invalid', () => {
    assert.equal(getQueueListMaxHeight(Number.NaN), 220);
  });
});
