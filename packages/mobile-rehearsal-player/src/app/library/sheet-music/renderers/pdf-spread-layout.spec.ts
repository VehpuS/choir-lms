import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computePdfLayout,
  currentPageAt,
  pageAtOffset,
  scrollOffsetForPage,
} from './pdf-layout-model.js';
import {
  pagesOfSpread,
  spreadCount,
  spreadOfPage,
  stepTargetPage,
} from './pdf-spread-layout.js';

const CONTAINER = { height: 600, width: 1000 };
// A portrait page, three to four: 450 px wide at the 600 px viewer height.
const PAGE = { height: 800, width: 600 };

const spreadLayout = (
  pageCount: number,
  options: { container?: typeof CONTAINER; zoom?: number } = {},
) =>
  computePdfLayout({
    container: options.container ?? CONTAINER,
    layout: 'spread',
    pages: Array.from({ length: pageCount }, () => PAGE),
    zoom: options.zoom ?? 1,
  });

describe('spread pairing', () => {
  it('pairs page 1 with page 2, 3 with 4, and leaves an odd last page alone', () => {
    assert.equal(spreadCount(0), 0);
    assert.equal(spreadCount(4), 2);
    assert.equal(spreadCount(5), 3);
    assert.deepEqual([0, 1, 2, 3, 4].map(spreadOfPage), [0, 0, 1, 1, 2]);
    assert.deepEqual(pagesOfSpread(1, 5), { first: 2, last: 3 });
    assert.deepEqual(pagesOfSpread(2, 5), { first: 4, last: 4 });
  });
});

describe('stepTargetPage', () => {
  it('steps by spread in spread and lands on its first page', () => {
    const base = { layout: 'spread', pageCount: 81 } as const;

    assert.equal(stepTargetPage({ ...base, from: 0, step: 1 }), 2);
    assert.equal(stepTargetPage({ ...base, from: 3, step: 1 }), 4);
    assert.equal(stepTargetPage({ ...base, from: 4, step: -1 }), 2);
  });

  it('stops at either end, reaching a lone last page', () => {
    const base = { layout: 'spread', pageCount: 81 } as const;

    assert.equal(stepTargetPage({ ...base, from: 78, step: 1 }), 80);
    assert.equal(stepTargetPage({ ...base, from: 80, step: 1 }), 80);
    assert.equal(stepTargetPage({ ...base, from: 0, step: -1 }), 0);
  });

  it('steps by page in the other layouts', () => {
    assert.equal(
      stepTargetPage({ from: 5, layout: 'pages', pageCount: 10, step: 1 }),
      6,
    );
    assert.equal(
      stepTargetPage({ from: 9, layout: 'strip', pageCount: 10, step: 1 }),
      9,
    );
  });
});

describe('spread layout', () => {
  it('puts a pair side by side at one height, centered, fitting the whole pair', () => {
    const { boxes } = spreadLayout(2);

    // Height fit: 600 px high, so each page is 450 wide; 904 px with the gap.
    assert.deepEqual(boxes[0], { height: 600, left: 48, top: 0, width: 450 });
    assert.deepEqual(boxes[1], { height: 600, left: 502, top: 0, width: 450 });
  });

  it('fits the width when the viewer is wide and short of height', () => {
    const { boxes } = spreadLayout(2, {
      container: { height: 1000, width: 700 },
    });

    // (700 - 4) / 1.5 = 464 px high.
    assert.ok(Math.abs((boxes[0]?.height ?? 0) - 464) < 1e-9);
    assert.ok(Math.abs((boxes[1]?.height ?? 0) - 464) < 1e-9);
    assert.ok(
      Math.abs((boxes[1]?.left ?? 0) + (boxes[1]?.width ?? 0) - 700) < 3,
    );
  });

  it('gives each spread one slot as wide as the viewer, shared by its pages', () => {
    const { contentWidth, spans } = spreadLayout(4);

    assert.deepEqual(spans[0], { size: 1000, start: 0 });
    assert.deepEqual(spans[1], spans[0]);
    assert.deepEqual(spans[2], { size: 1000, start: 1000 });
    assert.deepEqual(spans[3], spans[2]);
    assert.equal(contentWidth, 2000);
  });

  it('centers an odd last page alone in its slot', () => {
    const { boxes, spans } = spreadLayout(3);

    assert.deepEqual(spans[2], { size: 1000, start: 1000 });
    // 450 px wide, centered: (1000 - 450) / 2 from the slot's start.
    assert.deepEqual(boxes[2], { height: 600, left: 1275, top: 0, width: 450 });
  });

  it('grows the slot with the zoom so a zoomed spread can be panned', () => {
    const { boxes, spans } = spreadLayout(2, { zoom: 2 });

    assert.equal(boxes[0]?.height, 1200);
    assert.equal(spans[0]?.size, 1804);
    assert.equal(boxes[0]?.left, 0);
  });

  it('is empty for a document with no pages', () => {
    const layout = spreadLayout(0);

    assert.deepEqual(layout.boxes, []);
    assert.equal(layout.contentWidth, 0);
  });
});

describe('reading a spread layout', () => {
  it('scrolls to the spread from either of its pages', () => {
    const layout = spreadLayout(4);

    assert.deepEqual(scrollOffsetForPage(layout, { fraction: 0, index: 2 }), {
      left: 1000,
      top: 0,
    });
    assert.deepEqual(scrollOffsetForPage(layout, { fraction: 0, index: 3 }), {
      left: 1000,
      top: 0,
    });
  });

  it('reads the first page of the spread at an offset, with the fraction through the slot', () => {
    const layout = spreadLayout(4);

    assert.deepEqual(pageAtOffset(layout, 1500), { fraction: 0.5, index: 2 });
    assert.deepEqual(pageAtOffset(layout, 0), { fraction: 0, index: 0 });
  });

  it('is on the spread under the middle of the viewport', () => {
    const layout = spreadLayout(6);

    assert.equal(currentPageAt(layout, 0, 1000), 0);
    assert.equal(currentPageAt(layout, 2000, 1000), 4);
    // Mostly on the second spread while still scrolling toward it.
    assert.equal(currentPageAt(layout, 600, 1000), 2);
  });
});
