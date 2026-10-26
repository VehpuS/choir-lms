import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MIN_SPREAD_VIEWER_WIDTH_PX,
  isSpreadAvailable,
  resolveEffectivePdfLayout,
} from './pdf-spread-availability.js';

describe('isSpreadAvailable', () => {
  it('needs room for two 360 px pages and their margins', () => {
    assert.equal(MIN_SPREAD_VIEWER_WIDTH_PX, 760);
    assert.equal(isSpreadAvailable({ width: 760 }), true);
    assert.equal(isSpreadAvailable({ width: 759 }), false);
  });

  it('is offered on a wide window and not on a phone, held either way', () => {
    assert.equal(isSpreadAvailable({ width: 1280 }), true);
    assert.equal(isSpreadAvailable({ width: 812 }), true);
    assert.equal(isSpreadAvailable({ width: 390 }), false);
  });
});

describe('resolveEffectivePdfLayout', () => {
  it('shows a stored spread as pages while the viewer is too narrow', () => {
    assert.equal(resolveEffectivePdfLayout('spread', false), 'pages');
  });

  it('shows spread when it fits', () => {
    assert.equal(resolveEffectivePdfLayout('spread', true), 'spread');
  });

  it('leaves every other layout as it is', () => {
    for (const layout of ['scroll', 'pages', 'strip'] as const) {
      assert.equal(resolveEffectivePdfLayout(layout, false), layout);
      assert.equal(resolveEffectivePdfLayout(layout, true), layout);
    }
  });
});
