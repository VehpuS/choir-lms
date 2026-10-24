import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computePdfLayout,
  pointOnPage,
  scrollOffsetForPoint,
} from '../renderers/pdf-layout-model.js';

// A pinch, wheel zoom, or double tap keeps the page point under the fingers by
// asking the layout model where to scroll once the pages have their new sizes.
// These specs run that against every layout, early and late in a long document
// (scaling the offsets by the content's size ratio drifts by up to about
// (zoom - 1) x 12 px, because the gaps between pages do not scale).

const VIEWER = { height: 400, width: 300 };
const PAGE_COUNT = 81;
// Pages that fit the viewer exactly at zoom 1 in `pages` (a 600 x 800 page at
// half scale is the 300 x 400 viewer).
const PAGES = Array.from({ length: PAGE_COUNT }, () => ({
  height: 800,
  width: 600,
}));
const TOLERANCE = 1e-9;

type LayoutName = 'pages' | 'scroll' | 'strip';

const layoutAt = (layout: LayoutName, zoom: number) =>
  computePdfLayout({ container: VIEWER, layout, pages: PAGES, zoom });

const zoomAround = (options: {
  from: number;
  layout: LayoutName;
  scroll: { left: number; top: number };
  to: number;
}) => {
  const before = layoutAt(options.layout, options.from);
  const after = layoutAt(options.layout, options.to);
  const focal = { x: 120, y: 160 };
  const point = pointOnPage(
    before,
    options.scroll.left + focal.x,
    options.scroll.top + focal.y,
  );

  assert.ok(point, 'the focal spot starts on a page');

  const next = scrollOffsetForPoint(after, point, focal);

  return {
    after: pointOnPage(after, next.left + focal.x, next.top + focal.y),
    before: point,
  };
};

const assertSamePoint = (result: ReturnType<typeof zoomAround>) => {
  assert.ok(result.after, 'the point is still on a page');
  assert.equal(result.after.index, result.before.index);
  assert.ok(Math.abs(result.after.fx - result.before.fx) < TOLERANCE);
  assert.ok(Math.abs(result.after.fy - result.before.fy) < TOLERANCE);
};

describe('focal-point zoom against the layout model', () => {
  it('holds the point in strip, early and late in a long document', () => {
    const early = layoutAt('strip', 1).boxes[5];
    const late = layoutAt('strip', 1).boxes[60];

    for (const box of [early, late]) {
      assertSamePoint(
        zoomAround({
          from: 1,
          layout: 'strip',
          scroll: { left: (box?.left ?? 0) + 20, top: 0 },
          to: 3,
        }),
      );
    }
  });

  it('holds the point in strip when zooming back out', () => {
    const box = layoutAt('strip', 3).boxes[40];

    assertSamePoint(
      zoomAround({
        from: 3,
        layout: 'strip',
        scroll: { left: (box?.left ?? 0) + 150, top: 200 },
        to: 1.5,
      }),
    );
  });

  it('holds the point in pages once the page is larger than the viewer', () => {
    const slot = layoutAt('pages', 2).spans[30];

    assertSamePoint(
      zoomAround({
        from: 2,
        layout: 'pages',
        scroll: { left: (slot?.start ?? 0) + 100, top: 150 },
        to: 4,
      }),
    );
  });

  it('holds the point in pages when zooming from fit into a larger page', () => {
    const slot = layoutAt('pages', 1).spans[12];

    assertSamePoint(
      zoomAround({
        from: 1,
        layout: 'pages',
        scroll: { left: slot?.start ?? 0, top: 0 },
        to: 3,
      }),
    );
  });

  it('holds the point in scroll (the column the gestures were built for)', () => {
    const box = layoutAt('scroll', 1).boxes[50];

    assertSamePoint(
      zoomAround({
        from: 1,
        layout: 'scroll',
        scroll: { left: 0, top: (box?.top ?? 0) + 100 },
        to: 3,
      }),
    );
  });
});
