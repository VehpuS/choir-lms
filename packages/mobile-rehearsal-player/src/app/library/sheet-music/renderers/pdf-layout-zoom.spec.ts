import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computePdfLayout,
  pointOnPage,
  scrollOffsetForPoint,
} from './pdf-layout-model.js';

const LETTER = { height: 792, width: 612 };

const layoutOf = (
  layout: 'pages' | 'scroll' | 'strip',
  pages = [LETTER, LETTER, LETTER],
  zoom = 1,
  container = { height: 400, width: 300 },
) => computePdfLayout({ container, layout, pages, zoom });

describe('zoom per layout', () => {
  // A portrait page and a landscape page in a portrait viewer: each layout
  // fits a different dimension at zoom 1.
  const viewer = { height: 600, width: 300 };
  const pages = [LETTER, { height: 400, width: 800 }];
  const boxAt = (layout: 'pages' | 'scroll' | 'strip', zoom: number, i = 0) =>
    layoutOf(layout, pages, zoom, viewer).boxes[i];

  it('fits the width at 100% in scroll, whatever the page shape', () => {
    assert.equal(boxAt('scroll', 1, 0)?.width, 300);
    assert.equal(boxAt('scroll', 1, 1)?.width, 300);
  });

  it('fits the viewer height at 100% in strip, whatever the page shape', () => {
    assert.equal(boxAt('strip', 1, 0)?.height, 600);
    assert.equal(boxAt('strip', 1, 1)?.height, 600);
  });

  it('fits the whole page inside the viewer at 100% in pages', () => {
    for (const index of [0, 1]) {
      const box = boxAt('pages', 1, index);

      assert.ok((box?.width ?? Infinity) <= 300 + 1e-9);
      assert.ok((box?.height ?? Infinity) <= 600 + 1e-9);
      // The tighter dimension is filled exactly.
      assert.ok(
        Math.abs((box?.width ?? 0) - 300) < 1e-9 ||
          Math.abs((box?.height ?? 0) - 600) < 1e-9,
      );
    }
  });

  it('scales every layout in proportion to zoom, so 200% is twice 100%', () => {
    for (const layout of ['scroll', 'pages', 'strip'] as const) {
      const fit = boxAt(layout, 1);
      const doubled = boxAt(layout, 2);

      assert.ok(
        Math.abs((doubled?.width ?? 0) - 2 * (fit?.width ?? 0)) < 1e-9,
        layout,
      );
      assert.ok(
        Math.abs((doubled?.height ?? 0) - 2 * (fit?.height ?? 0)) < 1e-9,
        layout,
      );
    }
  });

  it('covers 50% to 400% in every layout and clamps beyond them', () => {
    for (const layout of ['scroll', 'pages', 'strip'] as const) {
      const fit = boxAt(layout, 1)?.width ?? 0;

      assert.ok(Math.abs((boxAt(layout, 0.5)?.width ?? 0) - fit / 2) < 1e-9);
      assert.ok(Math.abs((boxAt(layout, 4)?.width ?? 0) - fit * 4) < 1e-9);
      assert.equal(boxAt(layout, 0.1)?.width, boxAt(layout, 0.5)?.width);
      assert.equal(boxAt(layout, 40)?.width, boxAt(layout, 4)?.width);
    }
  });

  it('keeps the viewer-wide slots of pages when zoomed out', () => {
    const result = layoutOf('pages', pages, 0.5, viewer);

    assert.deepEqual(
      result.spans.map((span) => span.size),
      [300, 300],
    );
  });
});

describe('pointOnPage and scrollOffsetForPoint', () => {
  const strip = layoutOf('strip', [LETTER, LETTER, LETTER], 1, {
    height: 396,
    width: 300,
  });

  it('finds the page under a content point and how far into it', () => {
    assert.deepEqual(pointOnPage(strip, 153, 99), {
      fx: 0.5,
      fy: 0.25,
      index: 0,
    });
    assert.equal(pointOnPage(strip, 306 + 6, 100), undefined);
    assert.equal(pointOnPage(strip, 50, 500), undefined);
  });

  it('scrolls so a page point sits under the focal spot', () => {
    // Page 1 starts at 318 and is 306 wide: its middle is 471, and with the
    // focal spot 100 px in, the view must start at 371.
    const offset = scrollOffsetForPoint(
      strip,
      { fx: 0.5, fy: 0.5, index: 1 },
      { x: 100, y: 50 },
    );

    // The strip is exactly as tall as the viewer, so there is nothing to
    // scroll vertically.
    assert.deepEqual(offset, { left: 371, top: 0 });
  });

  it('keeps the offsets inside the content', () => {
    const edge = scrollOffsetForPoint(
      strip,
      { fx: 1, fy: 0, index: 2 },
      { x: 0, y: 0 },
    );
    const start = scrollOffsetForPoint(
      strip,
      { fx: 0, fy: 0, index: 0 },
      { x: 200, y: 0 },
    );

    assert.equal(edge.left, strip.contentWidth - 300);
    assert.equal(start.left, 0);
  });

  it('gives the origin for a page that does not exist', () => {
    assert.deepEqual(
      scrollOffsetForPoint(strip, { fx: 0, fy: 0, index: 9 }, { x: 0, y: 0 }),
      { left: 0, top: 0 },
    );
  });
});
