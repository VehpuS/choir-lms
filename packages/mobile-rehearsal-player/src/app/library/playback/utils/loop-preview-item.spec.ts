/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isLoopPreviewItem } from './loop-preview-item.js';

describe('isLoopPreviewItem', () => {
  it('recognizes the editor preview ids and nothing else', () => {
    assert.equal(
      isLoopPreviewItem({ id: 'loop-preview:drive:a:0:5000' }),
      true,
    );
    assert.equal(isLoopPreviewItem({ id: 'loop:drive:a:2026' }), false);
    assert.equal(isLoopPreviewItem({ id: 'track:drive:a' }), false);
  });
});
