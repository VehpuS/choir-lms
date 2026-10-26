import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  markedPages,
  pageRangeHint,
  parsePageNumber,
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
