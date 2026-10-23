import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  READABLE_PDF_ZOOM,
  distanceBetween,
  doubleTapZoom,
  focalScrollOffset,
  isDoubleTap,
  midpointOf,
  zoomAfterPinch,
  zoomAfterWheel,
} from './pdf-zoom-gestures.js';

const near = (actual: number, expected: number, tolerance = 1e-9) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} vs ${expected}`,
  );
};

describe('zoomAfterWheel', () => {
  it('zooms in when the wheel goes up and out when it goes down', () => {
    assert.ok(zoomAfterWheel({ deltaMode: 0, deltaY: -10, zoom: 1 }) > 1);
    assert.ok(zoomAfterWheel({ deltaMode: 0, deltaY: 10, zoom: 1 }) < 1);
  });

  it('caps one large wheel notch so it does not jump across the range', () => {
    const notch = zoomAfterWheel({ deltaMode: 0, deltaY: -100, zoom: 1 });

    assert.ok(notch < 1.4, String(notch));
    near(notch, zoomAfterWheel({ deltaMode: 0, deltaY: -5000, zoom: 1 }));
  });

  it('reads line and page deltas as larger than pixel deltas', () => {
    const pixel = zoomAfterWheel({ deltaMode: 0, deltaY: -1, zoom: 1 });
    const line = zoomAfterWheel({ deltaMode: 1, deltaY: -1, zoom: 1 });

    assert.ok(line > pixel);
  });

  it('stays inside the PDF range', () => {
    assert.equal(zoomAfterWheel({ deltaMode: 0, deltaY: -30, zoom: 4 }), 4);
    assert.equal(zoomAfterWheel({ deltaMode: 0, deltaY: 30, zoom: 0.5 }), 0.5);
    assert.equal(
      zoomAfterWheel({ deltaMode: 0, deltaY: -30, max: 3, zoom: 3 }),
      3,
    );
  });
});

describe('zoomAfterPinch', () => {
  it('scales the starting zoom by how far the fingers moved apart', () => {
    near(
      zoomAfterPinch({ distance: 200, startDistance: 100, startZoom: 1 }),
      2,
    );
    near(zoomAfterPinch({ distance: 50, startDistance: 100, startZoom: 2 }), 1);
  });

  it('clamps to the range and ignores a pinch that started with no distance', () => {
    assert.equal(
      zoomAfterPinch({ distance: 900, startDistance: 100, startZoom: 1 }),
      4,
    );
    assert.equal(
      zoomAfterPinch({ distance: 1, startDistance: 100, startZoom: 1 }),
      0.5,
    );
    assert.equal(
      zoomAfterPinch({ distance: 50, startDistance: 0, startZoom: 1.5 }),
      1.5,
    );
  });

  it('measures finger distance and midpoint', () => {
    assert.equal(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
    assert.deepEqual(midpointOf({ x: 0, y: 10 }, { x: 10, y: 30 }), {
      x: 5,
      y: 20,
    });
  });
});

describe('focalScrollOffset', () => {
  it('keeps the content point under the fingers where it was', () => {
    // Zoom doubles the content; the point 100 px into the view at scroll 400
    // was at content 500, so it is at 1000 afterwards and scroll must be 900.
    const offset = focalScrollOffset({
      after: { height: 2000, width: 2000 },
      before: { height: 1000, width: 1000 },
      focal: { x: 100, y: 100 },
      scroll: { left: 400, top: 400 },
    });

    assert.deepEqual(offset, { left: 900, top: 900 });
  });

  it('scrolls back when zooming out and never below zero', () => {
    const offset = focalScrollOffset({
      after: { height: 500, width: 500 },
      before: { height: 1000, width: 1000 },
      focal: { x: 100, y: 100 },
      scroll: { left: 0, top: 0 },
    });

    assert.deepEqual(offset, { left: 0, top: 0 });
  });

  it('uses the measured sizes, so page gaps that do not scale are included', () => {
    // 10 pages with 12 px gaps: the content grows by less than the zoom ratio.
    const before = 10 * 100 + 9 * 12;
    const after = 10 * 200 + 9 * 12;
    const offset = focalScrollOffset({
      after: { height: after, width: 1 },
      before: { height: before, width: 1 },
      focal: { x: 0, y: 0 },
      scroll: { left: 0, top: before / 2 },
    });

    near(offset.top, (before / 2) * (after / before));
  });

  it('leaves the scroll alone when a size was zero', () => {
    assert.deepEqual(
      focalScrollOffset({
        after: { height: 10, width: 10 },
        before: { height: 0, width: 0 },
        focal: { x: 5, y: 5 },
        scroll: { left: 20, top: 30 },
      }),
      { left: 20, top: 30 },
    );
  });
});

describe('double tap', () => {
  it('goes to a readable size from fit-to-width and back to fit from anywhere else', () => {
    assert.equal(doubleTapZoom(1), READABLE_PDF_ZOOM);
    assert.equal(doubleTapZoom(1.03), READABLE_PDF_ZOOM);
    assert.equal(doubleTapZoom(READABLE_PDF_ZOOM), 1);
    assert.equal(doubleTapZoom(3.5), 1);
    assert.equal(doubleTapZoom(0.7), 1);
  });

  it('counts two taps close in time and place', () => {
    const first = { time: 1000, x: 100, y: 100 };

    assert.equal(isDoubleTap(first, { time: 1200, x: 110, y: 105 }), true);
  });

  it('does not count a slow second tap, a distant one, or a first tap', () => {
    const first = { time: 1000, x: 100, y: 100 };

    assert.equal(isDoubleTap(first, { time: 1400, x: 100, y: 100 }), false);
    assert.equal(isDoubleTap(first, { time: 1100, x: 200, y: 100 }), false);
    assert.equal(isDoubleTap(undefined, { time: 1100, x: 100, y: 100 }), false);
  });
});
