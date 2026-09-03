/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveHorizontalScrollEdgeFades } from './view-switcher-overflow-model.js';

describe('resolveHorizontalScrollEdgeFades', () => {
  it('shows neither fade when content fits within the container', () => {
    assert.deepEqual(
      resolveHorizontalScrollEdgeFades({
        containerWidth: 400,
        contentWidth: 300,
        scrollX: 0,
      }),
      { showLeadingFade: false, showTrailingFade: false },
    );
  });

  it('shows only a trailing fade at the start of an overflowing row', () => {
    assert.deepEqual(
      resolveHorizontalScrollEdgeFades({
        containerWidth: 300,
        contentWidth: 500,
        scrollX: 0,
      }),
      { showLeadingFade: false, showTrailingFade: true },
    );
  });

  it('shows both fades once scrolled partway through', () => {
    assert.deepEqual(
      resolveHorizontalScrollEdgeFades({
        containerWidth: 300,
        contentWidth: 500,
        scrollX: 100,
      }),
      { showLeadingFade: true, showTrailingFade: true },
    );
  });

  it('shows only a leading fade once scrolled all the way to the end', () => {
    assert.deepEqual(
      resolveHorizontalScrollEdgeFades({
        containerWidth: 300,
        contentWidth: 500,
        scrollX: 200,
      }),
      { showLeadingFade: true, showTrailingFade: false },
    );
  });

  it('treats a near-exact match at either end as within measurement slop', () => {
    assert.deepEqual(
      resolveHorizontalScrollEdgeFades({
        containerWidth: 300,
        contentWidth: 500,
        scrollX: 0.5,
      }),
      { showLeadingFade: false, showTrailingFade: true },
    );
    assert.deepEqual(
      resolveHorizontalScrollEdgeFades({
        containerWidth: 300,
        contentWidth: 500,
        scrollX: 199.5,
      }),
      { showLeadingFade: true, showTrailingFade: false },
    );
  });
});
