import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  markedPages,
  pageRangeHint,
  parsePageNumber,
  THUMBNAIL_MAX_WIDTH,
  THUMBNAIL_MIN_WIDTH,
  thumbnailGrid,
  thumbnailRowHeight,
  visibleRows,
} from './go-to-page-model.js';

describe('parsePageNumber', () => {
  it('turns a whole number in range into a 0-based page', () => {
    assert.equal(parsePageNumber('1', 81), 0);
    assert.equal(parsePageNumber('40', 81), 39);
    assert.equal(parsePageNumber(' 12 ', 81), 11);
  });

  it('accepts the last page', () => {
    assert.equal(parsePageNumber('81', 81), 80);
  });

  it('rejects blank, zero, and past the end', () => {
    assert.equal(parsePageNumber('', 81), undefined);
    assert.equal(parsePageNumber('   ', 81), undefined);
    assert.equal(parsePageNumber('0', 81), undefined);
    assert.equal(parsePageNumber('82', 81), undefined);
  });

  it('rejects decimals, signs, and words', () => {
    assert.equal(parsePageNumber('4.5', 81), undefined);
    assert.equal(parsePageNumber('-3', 81), undefined);
    assert.equal(parsePageNumber('+3', 81), undefined);
    assert.equal(parsePageNumber('3a', 81), undefined);
    assert.equal(parsePageNumber('1e1', 81), undefined);
  });

  it('accepts nothing for an empty document', () => {
    assert.equal(parsePageNumber('1', 0), undefined);
  });
});

describe('pageRangeHint', () => {
  it('shows the accepted range', () => {
    assert.equal(pageRangeHint(81), '1-81');
    assert.equal(pageRangeHint(1), '1-1');
  });
});

describe('markedPages', () => {
  it('marks the current page outside spread', () => {
    assert.deepEqual(markedPages('scroll', 11, 81), [11]);
    assert.deepEqual(markedPages('pages', 0, 81), [0]);
    assert.deepEqual(markedPages('strip', 80, 81), [80]);
  });

  it('marks both pages of the spread, pairing page 1 with page 2', () => {
    assert.deepEqual(markedPages('spread', 0, 81), [0, 1]);
    assert.deepEqual(markedPages('spread', 1, 81), [0, 1]);
    assert.deepEqual(markedPages('spread', 6, 81), [6, 7]);
    assert.deepEqual(markedPages('spread', 7, 81), [6, 7]);
  });

  it('marks an odd last page alone in spread', () => {
    assert.deepEqual(markedPages('spread', 80, 81), [80]);
  });

  it('marks nothing for an empty document', () => {
    assert.deepEqual(markedPages('spread', 0, 0), []);
  });
});

describe('visibleRows', () => {
  const base = { columns: 3, margin: 1, pageCount: 81, rowHeight: 100 };

  it('includes the visible rows plus a margin row each side', () => {
    // Viewport covers rows 2-3 (pages 6-11); margin adds rows 1 and 4.
    const pages = visibleRows({ ...base, scrollTop: 200, viewportHeight: 200 });

    assert.equal(pages[0], 3);
    assert.equal(pages.at(-1), 14);
    assert.equal(pages.length, 12);
  });

  it('keeps the margin inside the grid at the start', () => {
    const pages = visibleRows({ ...base, scrollTop: 0, viewportHeight: 200 });

    assert.equal(pages[0], 0);
    assert.equal(pages.at(-1), 8);
  });

  it('keeps the margin inside the grid at the end, with a short last row', () => {
    const pages = visibleRows({
      ...base,
      pageCount: 80,
      scrollTop: 2500,
      viewportHeight: 200,
    });

    assert.equal(pages.at(-1), 79);
  });

  it('counts a partly visible row as visible', () => {
    const pages = visibleRows({
      ...base,
      margin: 0,
      scrollTop: 50,
      viewportHeight: 100,
    });

    assert.deepEqual(pages, [0, 1, 2, 3, 4, 5]);
  });

  it('returns nothing without pages or a usable grid', () => {
    assert.deepEqual(
      visibleRows({ ...base, pageCount: 0, scrollTop: 0, viewportHeight: 200 }),
      [],
    );
    assert.deepEqual(
      visibleRows({ ...base, columns: 0, scrollTop: 0, viewportHeight: 200 }),
      [],
    );
  });
});

describe('thumbnailGrid', () => {
  it('fits three columns on a phone, with cells no narrower than the minimum', () => {
    const grid = thumbnailGrid(319);

    assert.equal(grid.columns, 3);
    assert.ok(grid.cellWidth >= THUMBNAIL_MIN_WIDTH);
  });

  it('adds columns as the width grows', () => {
    assert.equal(thumbnailGrid(676).columns, 6);
    assert.equal(thumbnailGrid(1076).columns, 10);
  });

  it('starts a new column exactly when another minimum-width cell fits', () => {
    // Three cells and two gaps at the minimum need 3 * 90 + 2 * 12 = 294.
    assert.equal(thumbnailGrid(293).columns, 2);
    assert.equal(thumbnailGrid(294).columns, 3);
    assert.equal(thumbnailGrid(294).cellWidth, THUMBNAIL_MIN_WIDTH);
  });

  it('shares the leftover width so the cells fill the row', () => {
    const { cellWidth, columns } = thumbnailGrid(319);

    assert.ok(Math.abs(cellWidth * columns + 12 * (columns - 1) - 319) < 1e-9);
  });

  it('keeps one column, capped, when the sheet is narrower than two cells', () => {
    assert.deepEqual(thumbnailGrid(120), { cellWidth: 120, columns: 1 });
    assert.deepEqual(thumbnailGrid(190), {
      cellWidth: THUMBNAIL_MAX_WIDTH,
      columns: 1,
    });
  });

  it('never returns a zero-size cell', () => {
    assert.equal(thumbnailGrid(0).columns, 1);
    assert.ok(thumbnailGrid(0).cellWidth > 0);
  });
});

describe('thumbnailRowHeight', () => {
  it('adds the letter-shaped thumbnail, the page number, and the gap', () => {
    // 85 px wide is 110 px tall on a letter page.
    assert.equal(thumbnailRowHeight(85), 110 + 20 + 12);
  });
});
