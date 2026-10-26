import type { PdfLayout } from '@org/audio-library-models';
import { clamp, range } from 'es-toolkit';

/**
 * `spread` is named here as a plain string because the layout joins
 * `PdfLayout` with `pdf-paging-follow-ups`; this model works either way.
 */
export type GoToPageLayout = PdfLayout | 'spread';

export const THUMBNAIL_MIN_WIDTH = 90;
export const THUMBNAIL_MAX_WIDTH = 160;
export const THUMBNAIL_GAP = 12;
export const THUMBNAIL_PAGE_ASPECT = 11 / 8.5;
export const THUMBNAIL_LABEL_HEIGHT = 20;
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
 * The pages to highlight in the grid: the pages in view (`current` to
 * `lastInView`, one unless several show side by side), or in `spread` both
 * pages of the spread that holds the current page (page 1 pairs with page 2; an
 * odd last page is alone).
 */
export const markedPages = (
  layout: GoToPageLayout,
  current: number,
  pageCount: number,
  lastInView: number = current,
): number[] => {
  if (pageCount <= 0) {
    return [];
  }

  const page = clamp(current, 0, pageCount - 1);

  if (layout !== 'spread') {
    return range(page, clamp(lastInView, page, pageCount - 1) + 1);
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

export type ThumbnailGrid = { cellWidth: number; columns: number };

/**
 * The grid for a given content width: as many columns as fit at the minimum
 * thumbnail width, the cells sharing the leftover width (up to the maximum).
 */
export const thumbnailGrid = (contentWidth: number): ThumbnailGrid => {
  const columns = Math.max(
    1,
    Math.floor(
      (contentWidth + THUMBNAIL_GAP) / (THUMBNAIL_MIN_WIDTH + THUMBNAIL_GAP),
    ),
  );
  const shared = (contentWidth - THUMBNAIL_GAP * (columns - 1)) / columns;

  return {
    cellWidth: clamp(shared, 1, THUMBNAIL_MAX_WIDTH),
    columns,
  };
};

/** A grid row's height: the thumbnail (letter-shaped), its page number, and the gap below. */
export const thumbnailRowHeight = (cellWidth: number): number =>
  Math.ceil(cellWidth * THUMBNAIL_PAGE_ASPECT) +
  THUMBNAIL_LABEL_HEIGHT +
  THUMBNAIL_GAP;
