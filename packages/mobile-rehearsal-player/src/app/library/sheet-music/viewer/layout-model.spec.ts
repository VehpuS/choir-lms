import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COMPACT_VIEWER_MAX_HEIGHT,
  isCompactViewerHeight,
} from './layout-model.js';

describe('isCompactViewerHeight', () => {
  it('is compact for a phone held sideways', () => {
    for (const height of [320, 375, 390, 430]) {
      assert.equal(isCompactViewerHeight(height), true, `${height}`);
    }
  });

  it('keeps the roomy layout for an upright phone and a tablet in either orientation', () => {
    for (const height of [667, 812, 768, 1024, 834]) {
      assert.equal(isCompactViewerHeight(height), false, `${height}`);
    }
  });

  it('switches exactly at the limit', () => {
    assert.equal(isCompactViewerHeight(COMPACT_VIEWER_MAX_HEIGHT - 1), true);
    assert.equal(isCompactViewerHeight(COMPACT_VIEWER_MAX_HEIGHT), false);
  });
});
