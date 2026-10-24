import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PDF_PAGE_GAP_PX,
  computePdfLayout,
  currentPageAt,
  fitScale,
  nearestPage,
  pageAtOffset,
  scrollOffsetForPage,
} from './pdf-layout-model.js';

const LETTER = { height: 792, width: 612 };
const WIDE = { height: 400, width: 800 };
const PHONE = { height: 400, width: 300 };

const layoutOf = (
  layout: 'pages' | 'scroll' | 'strip',
  pages = [LETTER, LETTER, LETTER],
  zoom = 1,
  container = PHONE,
) => computePdfLayout({ container, layout, pages, zoom });

describe('fitScale', () => {
  it('fits width, height, or the whole page', () => {
    assert.equal(fitScale('width', LETTER, { height: 100, width: 306 }), 0.5);
    assert.equal(fitScale('height', LETTER, { height: 396, width: 100 }), 0.5);
    assert.equal(fitScale('page', LETTER, { height: 792, width: 306 }), 0.5);
    assert.equal(fitScale('page', LETTER, { height: 396, width: 612 }), 0.5);
  });
});

describe('computePdfLayout: scroll', () => {
  it('stacks pages fitted to the width with a gap', () => {
    const result = layoutOf('scroll', [LETTER, WIDE], 1, {
      height: 400,
      width: 306,
    });

    assert.deepEqual(result.boxes[0], {
      height: 396,
      left: 0,
      top: 0,
      width: 306,
    });
    assert.equal(result.boxes[1]?.top, 396 + PDF_PAGE_GAP_PX);
    assert.equal(result.boxes[1]?.width, 306);
    assert.equal(result.boxes[1]?.height, 153);
    assert.equal(result.axis, 'vertical');
    assert.equal(result.contentHeight, 396 + 153 + PDF_PAGE_GAP_PX * 2);
  });

  it('scales every page with zoom', () => {
    const result = layoutOf('scroll', [LETTER], 2, { height: 400, width: 306 });

    assert.equal(result.boxes[0]?.width, 612);
    assert.equal(result.contentWidth, 612);
  });
});

describe('computePdfLayout: strip', () => {
  it('places pages in a row, each as tall as the viewer', () => {
    const result = layoutOf('strip', [LETTER, WIDE], 1, {
      height: 396,
      width: 300,
    });

    assert.equal(result.boxes[0]?.height, 396);
    assert.equal(result.boxes[0]?.width, 306);
    assert.equal(result.boxes[1]?.left, 306 + PDF_PAGE_GAP_PX);
    assert.equal(result.boxes[1]?.height, 396);
    assert.equal(result.boxes[1]?.width, 792);
    assert.equal(result.axis, 'horizontal');
    assert.equal(result.contentWidth, 306 + 792 + PDF_PAGE_GAP_PX * 2);
    assert.equal(result.contentHeight, 396);
  });
});

describe('computePdfLayout: pages', () => {
  it('fits each page whole and centers it in a viewer-wide slot', () => {
    const result = layoutOf('pages', [LETTER, LETTER], 1, {
      height: 396,
      width: 400,
    });

    // Height is the tighter fit: 0.5 scale gives a 306 x 396 page.
    assert.equal(result.boxes[0]?.width, 306);
    assert.equal(result.boxes[0]?.left, 47);
    assert.equal(result.boxes[0]?.top, 0);
    assert.equal(result.boxes[1]?.left, 400 + 47);
    assert.deepEqual(result.spans, [
      { size: 400, start: 0 },
      { size: 400, start: 400 },
    ]);
    assert.equal(result.contentWidth, 800);
  });

  it('centers a short page vertically', () => {
    const result = layoutOf('pages', [WIDE], 1, { height: 400, width: 400 });

    assert.equal(result.boxes[0]?.width, 400);
    assert.equal(result.boxes[0]?.height, 200);
    assert.equal(result.boxes[0]?.top, 100);
  });

  it('grows the slot when a page is zoomed past the viewer', () => {
    const result = layoutOf('pages', [LETTER, LETTER], 2, {
      height: 396,
      width: 400,
    });

    assert.equal(result.boxes[0]?.width, 612);
    assert.equal(result.spans[0]?.size, 612);
    assert.equal(result.spans[1]?.start, 612);
    assert.equal(result.boxes[0]?.left, 0);
    assert.equal(result.contentHeight, 792);
  });
});

describe('pageAtOffset', () => {
  it('finds the page at an offset and the fraction through it', () => {
    const result = layoutOf('strip', [LETTER, LETTER], 1, {
      height: 396,
      width: 300,
    });

    assert.deepEqual(pageAtOffset(result, 0), { fraction: 0, index: 0 });
    assert.deepEqual(pageAtOffset(result, 153), { fraction: 0.5, index: 0 });
    assert.deepEqual(pageAtOffset(result, 306 + PDF_PAGE_GAP_PX), {
      fraction: 0,
      index: 1,
    });
  });

  it('gives a gap offset to the page before it, at its end', () => {
    const result = layoutOf('strip', [LETTER, LETTER], 1, {
      height: 396,
      width: 300,
    });

    assert.deepEqual(pageAtOffset(result, 306 + 4), { fraction: 1, index: 0 });
  });

  it('clamps before the first page and past the last', () => {
    const result = layoutOf('scroll');

    assert.equal(pageAtOffset(result, -50).index, 0);
    assert.deepEqual(pageAtOffset(result, 1e9), { fraction: 1, index: 2 });
  });

  it('uses the slot in pages, so a swipe halfway is halfway', () => {
    const result = layoutOf('pages', [LETTER, LETTER], 1, {
      height: 396,
      width: 400,
    });

    assert.deepEqual(pageAtOffset(result, 600), { fraction: 0.5, index: 1 });
  });

  it('handles a document with no pages', () => {
    const result = layoutOf('scroll', []);

    assert.deepEqual(pageAtOffset(result, 10), { fraction: 0, index: 0 });
  });
});

describe('scrollOffsetForPage', () => {
  it('scrolls down to a page in scroll', () => {
    const result = layoutOf('scroll', [LETTER, LETTER, LETTER], 1, {
      height: 300,
      width: 306,
    });

    assert.deepEqual(scrollOffsetForPage(result, { fraction: 0, index: 1 }), {
      left: 0,
      top: 396 + PDF_PAGE_GAP_PX,
    });
    assert.deepEqual(scrollOffsetForPage(result, { fraction: 0.5, index: 1 }), {
      left: 0,
      top: 396 + PDF_PAGE_GAP_PX + 198,
    });
  });

  it("scrolls sideways to a slot's start in pages at any zoom", () => {
    const fitted = layoutOf('pages', [LETTER, LETTER, LETTER], 1, {
      height: 396,
      width: 400,
    });
    const zoomed = layoutOf('pages', [LETTER, LETTER, LETTER], 2, {
      height: 396,
      width: 400,
    });

    assert.deepEqual(scrollOffsetForPage(fitted, { fraction: 0, index: 2 }), {
      left: 800,
      top: 0,
    });
    assert.deepEqual(scrollOffsetForPage(zoomed, { fraction: 0, index: 2 }), {
      left: 1224,
      top: 0,
    });
  });

  it('never scrolls past the end of the content', () => {
    const result = layoutOf('strip', [LETTER, LETTER], 1, {
      height: 396,
      width: 300,
    });
    const { contentWidth } = result;

    assert.deepEqual(scrollOffsetForPage(result, { fraction: 1, index: 1 }), {
      left: contentWidth - 300,
      top: 0,
    });
  });

  it('round-trips a position through the offset', () => {
    const result = layoutOf('strip', [LETTER, WIDE, LETTER], 1.5, {
      height: 396,
      width: 300,
    });
    const target = { fraction: 0.25, index: 1 };
    const offset = scrollOffsetForPage(result, target);

    const found = pageAtOffset(result, offset.left);

    assert.equal(found.index, target.index);
    assert.ok(Math.abs(found.fraction - target.fraction) < 1e-9);
  });
});

describe('nearestPage', () => {
  it('stays on the page until more than half has scrolled past', () => {
    assert.equal(nearestPage({ fraction: 0.5, index: 4 }, 10), 4);
    assert.equal(nearestPage({ fraction: 0.51, index: 4 }, 10), 5);
  });

  it('never goes past the last page or before the first', () => {
    assert.equal(nearestPage({ fraction: 0.9, index: 9 }, 10), 9);
    assert.equal(nearestPage({ fraction: 0, index: 0 }, 0), 0);
  });
});

describe('currentPageAt', () => {
  const column = layoutOf('scroll', [LETTER, LETTER, LETTER], 1, {
    height: 400,
    width: 306,
  });

  it('is the page under the middle of the viewport', () => {
    // Pages are 396 tall with 12 between; the viewport is 400 tall.
    assert.equal(currentPageAt(column, 0, 400), 0);
    // A middle that falls in the gap still belongs to the page above it.
    assert.equal(currentPageAt(column, 200, 400), 0);
    assert.equal(currentPageAt(column, 210, 400), 1);
    assert.equal(currentPageAt(column, 408, 400), 1);
  });

  it('is the snapped page in pages', () => {
    const paged = layoutOf('pages', [LETTER, LETTER, LETTER], 1, {
      height: 396,
      width: 400,
    });

    assert.equal(currentPageAt(paged, 400, 400), 1);
    assert.equal(currentPageAt(paged, 800, 400), 2);
  });

  it('is the first page for an empty document', () => {
    assert.equal(currentPageAt(layoutOf('strip', []), 0, 300), 0);
  });
});

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
