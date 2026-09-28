/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appTheme } from '../../../utils/theme.js';
import {
  resolveEdgeFadeStops,
  resolveHorizontalScrollEdgeFades,
  VIEW_SWITCHER_EDGE_FADE_COLOR,
} from './view-switcher-overflow-model.js';

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

describe('view switcher edge fade', () => {
  it('fades to the Library ground the row sits on', () => {
    assert.equal(VIEW_SWITCHER_EDGE_FADE_COLOR, appTheme.colors.pageBackground);
  });

  it('is opaque at the leading screen edge and clear toward the chips', () => {
    const [start, end] = resolveEdgeFadeStops('leading');

    assert.equal(start.offset, 0);
    assert.equal(start.opacity, 1);
    assert.equal(end.offset, 1);
    assert.equal(end.opacity, 0);
  });

  it('is clear toward the chips and opaque at the trailing screen edge', () => {
    const [start, end] = resolveEdgeFadeStops('trailing');

    assert.equal(start.opacity, 0);
    assert.equal(end.opacity, 1);
  });
});
