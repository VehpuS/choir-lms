import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PDF_PAGE_GAP_PX } from './pdf-layout-model.js';
import {
  isPagedLayout,
  isPdfSnapping,
  pdfColumnStyle,
  pdfObserverMargin,
  pdfPageStyle,
  pdfSnapType,
} from './pdf-layout-style.js';

const BOX = { height: 400, left: 0, top: 0, width: 300 };

describe('pdfObserverMargin', () => {
  it('looks ahead vertically in scroll and sideways in strip', () => {
    assert.equal(pdfObserverMargin('scroll'), '150% 0px');
    assert.equal(pdfObserverMargin('strip'), '0px 150%');
  });
});

describe('pdfColumnStyle', () => {
  it('stacks pages in scroll and lines them up in strip', () => {
    assert.match(pdfColumnStyle('scroll'), /flex-direction:column/);
    assert.match(pdfColumnStyle('strip'), /flex-direction:row/);
  });

  it('sizes a row to its pages, margins included, so the last slot is scrollable', () => {
    for (const layout of ['pages', 'strip'] as const) {
      assert.match(pdfColumnStyle(layout), /width:max-content/);
      assert.match(pdfColumnStyle(layout), /min-width:100%/);
    }
  });

  it('pads the end of a spread row too', () => {
    assert.match(pdfColumnStyle('spread', 15), /padding-right:15px/);
  });

  it('pads the end of a pages row by the scrollbar gutter so the last slot is reachable', () => {
    assert.match(pdfColumnStyle('pages', 15), /padding-right:15px/);
    assert.doesNotMatch(pdfColumnStyle('pages', 0), /padding-right/);
  });

  it('adds no end padding in the other layouts', () => {
    assert.doesNotMatch(pdfColumnStyle('strip', 15), /padding-right/);
    assert.doesNotMatch(pdfColumnStyle('scroll', 15), /padding-right/);
  });

  it('starts a strip at the top so a zoomed page can be scrolled to', () => {
    assert.match(pdfColumnStyle('strip'), /align-items:flex-start/);
  });
});

describe('pdfPageStyle', () => {
  it('sizes the page and puts the gap below it in scroll', () => {
    const style = pdfPageStyle('scroll', BOX);

    assert.match(style, /width:300px;height:400px;/);
    assert.match(style, new RegExp(`margin:0 0 ${PDF_PAGE_GAP_PX}px;`));
  });

  it('puts the gap after the page in strip', () => {
    assert.match(
      pdfPageStyle('strip', BOX),
      new RegExp(`margin:0 ${PDF_PAGE_GAP_PX}px 0 0;`),
    );
  });

  it('keeps pages white and from shrinking', () => {
    assert.match(pdfPageStyle('strip', BOX), /background:#fff;flex:none;/);
  });
});

describe('pdfPageStyle in pages', () => {
  const slot = { size: 400, start: 400 };
  const centered = { height: 396, left: 447, top: 10, width: 306 };

  it('centers the page in its slot with margins', () => {
    const style = pdfPageStyle('pages', centered, slot);

    // 47px each side of a 306px page fills the 400px slot.
    assert.match(style, /margin:10px 47px 0 47px;/);
  });

  it('makes each slot a snap point that a swipe cannot skip', () => {
    const style = pdfPageStyle('pages', centered, slot);

    // The scroll margin widens the snap area from the page to its slot.
    assert.match(style, /scroll-snap-align:start;/);
    assert.match(style, /scroll-margin-left:47px;/);
    assert.match(style, /scroll-snap-stop:always;/);
  });

  it('does not snap or add a gap in the other layouts', () => {
    assert.doesNotMatch(pdfPageStyle('strip', centered), /scroll-snap/);
    assert.doesNotMatch(pdfPageStyle('scroll', centered), /scroll-snap/);
  });
});

describe('pdfPageStyle in spread', () => {
  // A 1000 px slot holding two 450 px pages with a 4 px gap, centered.
  const slot = { size: 1000, start: 1000 };
  const first = { height: 600, left: 1048, top: 0, width: 450 };
  const second = { height: 600, left: 1502, top: 0, width: 450 };

  it('gives the first page the centering margin and the gap to its partner', () => {
    const style = pdfPageStyle('spread', first, slot, {
      isFirst: true,
      next: second,
    });

    // 48 before; 1502 - (1048 + 450) = 4 to the partner.
    assert.match(style, /margin:0px 4px 0 48px;/);
  });

  it('gives the second page the rest of the slot after it, and no margin before', () => {
    const style = pdfPageStyle('spread', second, slot, { isFirst: false });

    // The slot ends at 2000; the page ends at 1952.
    assert.match(style, /margin:0px 48px 0 0;/);
  });

  it('makes only the first page of a spread a snap point', () => {
    const firstStyle = pdfPageStyle('spread', first, slot, {
      isFirst: true,
      next: second,
    });
    const secondStyle = pdfPageStyle('spread', second, slot, {
      isFirst: false,
    });

    assert.match(firstStyle, /scroll-snap-align:start;/);
    assert.match(firstStyle, /scroll-margin-left:48px;/);
    assert.match(firstStyle, /scroll-snap-stop:always;/);
    assert.doesNotMatch(secondStyle, /scroll-snap/);
  });

  it('fills the slot with a lone last page centered by its margins', () => {
    const alone = { height: 600, left: 1275, top: 0, width: 450 };
    const style = pdfPageStyle('spread', alone, slot, { isFirst: true });

    // 275 before and 275 after a 450 px page fill the 1000 px slot.
    assert.match(style, /margin:0px 275px 0 275px;/);
  });
});

describe('isPagedLayout', () => {
  it('is pages and spread', () => {
    assert.equal(isPagedLayout('pages'), true);
    assert.equal(isPagedLayout('spread'), true);
    assert.equal(isPagedLayout('scroll'), false);
    assert.equal(isPagedLayout('strip'), false);
  });
});

describe('isPdfSnapping', () => {
  it('snaps a spread while fitted, like pages', () => {
    assert.equal(isPdfSnapping('spread', 1), true);
    assert.equal(isPdfSnapping('spread', 1.5), false);
    assert.equal(pdfSnapType('spread', 1), 'x mandatory');
  });

  it('snaps in pages while fitted or zoomed out', () => {
    assert.equal(isPdfSnapping('pages', 1), true);
    assert.equal(isPdfSnapping('pages', 0.5), true);
    assert.equal(pdfSnapType('pages', 1), 'x mandatory');
  });

  it('stops snapping once zoomed in', () => {
    assert.equal(isPdfSnapping('pages', 1.01), false);
    assert.equal(pdfSnapType('pages', 2), '');
  });

  it('never snaps in scroll or strip', () => {
    assert.equal(isPdfSnapping('scroll', 1), false);
    assert.equal(isPdfSnapping('strip', 1), false);
    assert.equal(pdfSnapType('strip', 1), '');
  });
});
