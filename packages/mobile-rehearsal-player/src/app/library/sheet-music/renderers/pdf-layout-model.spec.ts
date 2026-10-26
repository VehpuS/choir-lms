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
  visiblePageRange,
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

  it('moves on by a whole slot when a layout holds two pages in one', () => {
    // In a spread the position's page is the first of its pair, so the next
    // slot starts two pages on.
    assert.equal(nearestPage({ fraction: 0.4, index: 74 }, 81, 2), 74);
    assert.equal(nearestPage({ fraction: 0.9995, index: 74 }, 81, 2), 76);
    assert.equal(nearestPage({ fraction: 0.9, index: 80 }, 81, 2), 80);
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

describe('visiblePageRange', () => {
  const WIDE_VIEWER = { height: 400, width: 900 };
  const strip = (pageCount: number, zoom = 1) =>
    layoutOf(
      'strip',
      Array.from({ length: pageCount }, () => LETTER),
      zoom,
      WIDE_VIEWER,
    );

  it('lists every page that is mostly in view, from the start edge', () => {
    const layout = strip(10);

    assert.deepEqual(visiblePageRange(layout, 0, 900), { first: 0, last: 2 });
  });

  it('starts at a page aligned to the start edge', () => {
    const layout = strip(10);
    const start = layout.spans[5]?.start ?? 0;

    assert.deepEqual(visiblePageRange(layout, start, 900), {
      first: 5,
      last: 7,
    });
  });

  it('drops a page once less than half of it shows', () => {
    const layout = strip(10);
    const span = layout.spans[3];
    const offset = (span?.start ?? 0) + (span?.size ?? 0) * 0.6;

    assert.equal(visiblePageRange(layout, offset, 900).first, 4);
  });

  it('keeps the last pages at the end of the document', () => {
    const layout = strip(10);
    const end = layout.contentWidth - 900;

    assert.deepEqual(visiblePageRange(layout, end, 900), { first: 7, last: 9 });
  });

  it('is one page where a page is bigger than the viewer', () => {
    const layout = layoutOf('pages', [LETTER, LETTER, LETTER], 4, WIDE_VIEWER);
    const middle = currentPageAt(layout, 1500, 900);
    const range = visiblePageRange(layout, 1500, 900);

    assert.deepEqual(range, { first: middle, last: middle });
  });
});
