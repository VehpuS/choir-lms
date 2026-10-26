import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PdfLayout } from '@org/audio-library-models';

import { computePdfLayout } from './pdf-layout-model.js';
import {
  createPdfScroller,
  type PdfScrollHost,
  type PdfScrollState,
} from './pdf-scroll-position.js';

const PAGE = { height: 800, width: 600 };
const CONTAINER = { height: 600, width: 400 };
const PAGE_COUNT = 5;

const stateFor = (
  currentLayout: PdfLayout,
  currentZoom = 1,
): PdfScrollState => ({
  currentLayout,
  currentZoom,
  layout: computePdfLayout({
    container: CONTAINER,
    layout: currentLayout,
    pages: Array.from({ length: PAGE_COUNT }, () => PAGE),
    zoom: currentZoom,
  }),
  pageCount: PAGE_COUNT,
});

const fakeHost = (): PdfScrollHost => ({
  clientHeight: CONTAINER.height,
  clientWidth: CONTAINER.width,
  scrollLeft: 0,
  scrollTop: 0,
  style: { scrollSnapType: '' },
});

// The state is swapped to model the viewer changing layout or zoom between calls.
const setup = (initial: PdfScrollState) => {
  const box = { state: initial };
  const host = fakeHost();
  const scroller = createPdfScroller({ getState: () => box.state, host });

  return { box, host, scroller };
};

describe('createPdfScroller scrollToPage and mainOffset', () => {
  it('scrolls a column down to a page and reads the vertical offset', () => {
    const { box, host, scroller } = setup(stateFor('scroll'));
    const start = box.state.layout.spans[2]?.start;

    scroller.scrollToPage(2);

    assert.equal(host.scrollTop, start);
    assert.equal(host.scrollLeft, 0);
    assert.equal(scroller.mainOffset(), start);
  });

  it('scrolls a paged row sideways to a page and reads the horizontal offset', () => {
    const { box, host, scroller } = setup(stateFor('pages'));
    const start = box.state.layout.spans[3]?.start;

    scroller.scrollToPage(3);

    assert.equal(host.scrollLeft, start);
    assert.equal(host.scrollTop, 0);
    assert.equal(scroller.mainOffset(), start);
  });

  it('goes part of the way through a page when given a fraction', () => {
    const { box, host, scroller } = setup(stateFor('scroll'));
    const span = box.state.layout.spans[1];

    scroller.scrollToPage(1, 0.5);

    assert.equal(host.scrollTop, (span?.start ?? 0) + (span?.size ?? 0) / 2);
  });
});

describe('createPdfScroller updateSnapping', () => {
  it('snaps a fitted paged view and settles on the page the reader is mostly on', () => {
    const { box, host, scroller } = setup(stateFor('pages'));
    const slot = box.state.layout.spans[1]?.start ?? 0;

    // 60% of the way into the second page: the third page is nearer.
    host.scrollLeft = slot + (box.state.layout.spans[1]?.size ?? 0) * 0.6;
    scroller.updateSnapping();

    assert.equal(host.style.scrollSnapType, 'x mandatory');
    assert.equal(host.scrollLeft, box.state.layout.spans[2]?.start);
  });

  it('does not move the view again while snapping stays on', () => {
    const { host, scroller } = setup(stateFor('pages'));

    scroller.updateSnapping();
    host.scrollLeft = 123;
    scroller.updateSnapping();

    assert.equal(host.scrollLeft, 123);
  });

  it('settles again after resetSnapping', () => {
    const { host, scroller } = setup(stateFor('pages'));

    scroller.updateSnapping();
    host.scrollLeft = 10;
    scroller.resetSnapping();
    scroller.updateSnapping();

    assert.equal(host.scrollLeft, 0);
  });

  it('turns snapping off when zoomed in and on again at the fit', () => {
    const { box, host, scroller } = setup(stateFor('pages'));

    scroller.updateSnapping();
    box.state = stateFor('pages', 2);
    scroller.updateSnapping();

    assert.equal(host.style.scrollSnapType, '');

    box.state = stateFor('pages', 1);
    scroller.updateSnapping();

    assert.equal(host.style.scrollSnapType, 'x mandatory');
  });

  it('never snaps a column', () => {
    const { host, scroller } = setup(stateFor('scroll'));

    scroller.updateSnapping();

    assert.equal(host.style.scrollSnapType, '');
  });
});

describe('createPdfScroller readAnchor and restoreAnchor', () => {
  it('keeps the same spot in a column across a zoom', () => {
    const { box, host, scroller } = setup(stateFor('scroll'));

    scroller.scrollToPage(2, 0.25);

    const anchor = scroller.readAnchor();

    box.state = stateFor('scroll', 2);
    scroller.restoreAnchor(anchor);

    const restored = scroller.readAnchor();

    assert.equal(anchor.index, 2);
    assert.equal(restored.index, 2);
    assert.ok(Math.abs(restored.fraction - 0.25) < 1e-9);
    assert.equal(host.scrollLeft, 0);
  });

  it('moves only the scrolling axis, leaving a pan across it alone', () => {
    const { box, host, scroller } = setup(stateFor('scroll', 2));

    host.scrollLeft = 77;
    scroller.scrollToPage(1);
    host.scrollLeft = 77;

    const anchor = scroller.readAnchor();

    box.state = stateFor('scroll', 3);
    scroller.restoreAnchor(anchor);

    assert.equal(host.scrollLeft, 77);
  });

  it('snaps to the nearest page while a paged view is fitted', () => {
    const { box, host, scroller } = setup(stateFor('pages'));

    scroller.restoreAnchor({ fraction: 0.8, index: 1 });

    assert.equal(host.scrollLeft, box.state.layout.spans[2]?.start);
  });
});

describe('createPdfScroller in spread', () => {
  it('reports the pair in view as the range and the first page as the page', () => {
    const { host, scroller } = setup(stateFor('spread'));

    // Each slot is 400 px wide; 400 is the second spread (pages 3 and 4).
    host.scrollLeft = 400;

    assert.equal(scroller.currentPage(), 2);
    assert.deepEqual(scroller.currentRange(), { first: 2, last: 3 });
  });

  it('reports a lone last page as one page', () => {
    const { host, scroller } = setup(stateFor('spread'));

    host.scrollLeft = 800;

    assert.deepEqual(scroller.currentRange(), { first: 4, last: 4 });
  });

  it('keeps the reader on the spread they are at when the view is half a pixel short of it', () => {
    const { box, host, scroller } = setup(stateFor('spread'));

    // The browser can leave the offset a hair before a slot's start (400).
    host.scrollLeft = 399.5;

    const anchor = scroller.readAnchor();

    // A resize lays the slots out again; the reader stays on the second spread.
    box.state = stateFor('spread');
    scroller.restoreAnchor(anchor);

    assert.equal(host.scrollLeft, 400);
  });

  it('settles on the nearer spread when snapping turns back on', () => {
    const { box, host, scroller } = setup(stateFor('spread', 2));

    host.scrollLeft = 390;
    box.state = stateFor('spread');
    scroller.updateSnapping();

    assert.equal(host.scrollLeft, 400);
  });

  it('scrolls to the spread from the second of its pages', () => {
    const { host, scroller } = setup(stateFor('spread'));

    scroller.scrollToPage(3);

    assert.equal(host.scrollLeft, 400);
  });
});

describe('createPdfScroller currentPage and currentRange', () => {
  it('reads the page under the middle of the viewport', () => {
    const { box, host, scroller } = setup(stateFor('scroll'));

    host.scrollTop = (box.state.layout.spans[2]?.start ?? 0) + 10;

    assert.equal(scroller.currentPage(), 2);
    assert.deepEqual(scroller.currentRange(), { first: 2, last: 2 });
  });

  it('gives one page outside strip even when two are partly in view', () => {
    const { box, host, scroller } = setup(stateFor('pages'));

    host.scrollLeft = (box.state.layout.spans[1]?.start ?? 0) + 40;

    assert.equal(scroller.currentRange().first, scroller.currentRange().last);
  });

  it('gives every page that is mostly in view in strip', () => {
    // A wide viewer shows several side-by-side pages at once.
    const box = { state: stateFor('strip') };
    const host: PdfScrollHost = { ...fakeHost(), clientWidth: 900 };
    const wide = computePdfLayout({
      container: { height: CONTAINER.height, width: 900 },
      layout: 'strip',
      pages: Array.from({ length: PAGE_COUNT }, () => PAGE),
      zoom: 1,
    });

    box.state = { ...box.state, layout: wide };

    const scroller = createPdfScroller({ getState: () => box.state, host });

    host.scrollLeft = wide.spans[1]?.start ?? 0;

    const range = scroller.currentRange();

    assert.equal(range.first, 1);
    assert.ok(range.last > range.first);
  });
});
