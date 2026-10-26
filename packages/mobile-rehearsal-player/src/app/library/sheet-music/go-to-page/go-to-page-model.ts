import type { PdfLayout } from '@org/audio-library-models';
import { clamp, range } from 'es-toolkit';

/**
 * `spread` is named here as a plain string because the layout joins
 * `PdfLayout` with `pdf-paging-follow-ups`; this model works either way.
 */
export type GoToPageLayout = PdfLayout | 'spread';

const SPREAD_SIZE = 2;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

/**
 * The 0-based page for text typed in the field, or undefined unless it is a
 * whole number from 1 to the page count (no clamping, signs, or decimals).
 */
export const parsePageNumber = (
  text: string,
  pageCount: number,
): number | undefined => {
  const trimmed = text.trim();

  if (!WHOLE_NUMBER_PATTERN.test(trimmed)) {
    return undefined;
  }

  const pageNumber = Number(trimmed);

  return pageNumber >= 1 && pageNumber <= pageCount
    ? pageNumber - 1
    : undefined;
};

/** The range the field accepts, such as `1-81`. */
export const pageRangeHint = (pageCount: number): string =>
  `1-${Math.max(1, pageCount)}`;

/**
 * The pages to highlight in the grid: the current page, or in `spread` both
 * pages of the spread that holds it (page 1 pairs with page 2; an odd last
 * page is alone).
 */
export const markedPages = (
  layout: GoToPageLayout,
  current: number,
  pageCount: number,
): number[] => {
  if (pageCount <= 0) {
    return [];
  }

  const page = clamp(current, 0, pageCount - 1);

  if (layout !== 'spread') {
    return [page];
  }

  const first = page - (page % SPREAD_SIZE);

  return range(first, Math.min(first + SPREAD_SIZE, pageCount));
};

/**
 * The page indexes to draw thumbnails for: every page in the rows in view
 * plus `margin` rows on each side, in page order.
 */
export const visibleRows = (options: {
  columns: number;
  margin: number;
  pageCount: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
}): number[] => {
  const { columns, margin, pageCount, rowHeight, scrollTop, viewportHeight } =
    options;

  if (pageCount <= 0 || columns <= 0 || rowHeight <= 0) {
    return [];
  }

  const rowCount = Math.ceil(pageCount / columns);
  const firstRow = Math.max(0, Math.floor(scrollTop / rowHeight) - margin);
  const lastRow = Math.min(
    rowCount - 1,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) - 1 + margin,
  );

  if (firstRow > lastRow) {
    return [];
  }

  return range(
    firstRow * columns,
    Math.min((lastRow + 1) * columns, pageCount),
  );
};
