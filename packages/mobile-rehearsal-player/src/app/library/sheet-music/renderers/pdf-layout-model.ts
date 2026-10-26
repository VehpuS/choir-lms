import type { PdfLayout } from '@org/audio-library-models';
import { clamp } from 'es-toolkit';

import { clampPdfZoom } from './pdf-page-layout';
import { layoutSpread } from './pdf-spread-layout';

export const PDF_PAGE_GAP_PX = 12;

export type PdfLayoutSize = { height: number; width: number };

export type PdfPageBox = PdfLayoutSize & { left: number; top: number };

/** Where a page sits along the scrolling axis: `start`, then `size` onward. */
export type PdfPageSpan = { size: number; start: number };

export type PdfLayoutResult = {
  axis: 'horizontal' | 'vertical';
  /** Each page's drawn box within the scrolled content, in CSS pixels. */
  boxes: PdfPageBox[];
  container: PdfLayoutSize;
  contentHeight: number;
  contentWidth: number;
  /**
   * Each page's stretch of the scrolling axis. In `pages` it is the page's
   * whole slot (the fitted page is centered in it), so scrolling to a span's
   * start shows that page; in `spread` both pages share their spread's slot;
   * elsewhere it is the page's own extent.
   */
  spans: PdfPageSpan[];
};

export type PdfScrollOffset = { left: number; top: number };

export type PdfPagePosition = { fraction: number; index: number };

const safeSize = (size: PdfLayoutSize): PdfLayoutSize => ({
  height: Math.max(1, size.height),
  width: Math.max(1, size.width),
});

const scaledPage = (page: PdfLayoutSize, scale: number): PdfLayoutSize => {
  const safePage = safeSize(page);

  return { height: safePage.height * scale, width: safePage.width * scale };
};

/** The scale that fits a page's width, its height, or the whole page. */
export const fitScale = (
  fit: 'height' | 'page' | 'width',
  page: PdfLayoutSize,
  container: PdfLayoutSize,
): number => {
  const safePage = safeSize(page);
  const safeContainer = safeSize(container);
  const widthScale = safeContainer.width / safePage.width;
  const heightScale = safeContainer.height / safePage.height;

  if (fit === 'width') {
    return widthScale;
  }

  return fit === 'height' ? heightScale : Math.min(widthScale, heightScale);
};

const layoutScroll = (
  container: PdfLayoutSize,
  pages: PdfLayoutSize[],
  zoom: number,
): PdfLayoutResult => {
  let top = 0;
  const boxes = pages.map((page) => {
    const size = scaledPage(page, fitScale('width', page, container) * zoom);
    const box = { ...size, left: 0, top };

    top += size.height + PDF_PAGE_GAP_PX;

    return box;
  });

  return {
    axis: 'vertical',
    boxes,
    container,
    contentHeight: top,
    contentWidth: container.width * zoom,
    spans: boxes.map((box) => ({ size: box.height, start: box.top })),
  };
};

const layoutStrip = (
  container: PdfLayoutSize,
  pages: PdfLayoutSize[],
  zoom: number,
): PdfLayoutResult => {
  let left = 0;
  const boxes = pages.map((page) => {
    const size = scaledPage(page, fitScale('height', page, container) * zoom);
    const box = { ...size, left, top: 0 };

    left += size.width + PDF_PAGE_GAP_PX;

    return box;
  });

  return {
    axis: 'horizontal',
    boxes,
    container,
    contentHeight: container.height * zoom,
    contentWidth: left,
    spans: boxes.map((box) => ({ size: box.width, start: box.left })),
  };
};

const layoutPages = (
  container: PdfLayoutSize,
  pages: PdfLayoutSize[],
  zoom: number,
): PdfLayoutResult => {
  let slotStart = 0;
  let contentHeight = container.height;
  const spans: PdfPageSpan[] = [];
  const boxes = pages.map((page) => {
    const size = scaledPage(page, fitScale('page', page, container) * zoom);
    // A zoomed page is wider than the viewer, so its slot grows with it.
    const slotWidth = Math.max(container.width, size.width);
    const box = {
      ...size,
      left: slotStart + (slotWidth - size.width) / 2,
      top: Math.max(0, (container.height - size.height) / 2),
    };

    spans.push({ size: slotWidth, start: slotStart });
    slotStart += slotWidth;
    contentHeight = Math.max(contentHeight, box.top + size.height);

    return box;
  });

  return {
    axis: 'horizontal',
    boxes,
    container,
    contentHeight,
    contentWidth: slotStart,
    spans,
  };
};

/**
 * Places every page for a layout. Zoom is relative to the layout's fit: 1
 * fits the width in `scroll`, the whole page in `pages`, the height in
 * `strip`, and the whole pair of pages in `spread`.
 */
export const computePdfLayout = (options: {
  container: PdfLayoutSize;
  layout: PdfLayout;
  pages: PdfLayoutSize[];
  zoom: number;
}): PdfLayoutResult => {
  const container = safeSize(options.container);
  const zoom = clampPdfZoom(options.zoom);

  if (options.layout === 'strip') {
    return layoutStrip(container, options.pages, zoom);
  }

  if (options.layout === 'spread') {
    return layoutSpread(container, options.pages, zoom);
  }

  return options.layout === 'pages'
    ? layoutPages(container, options.pages, zoom)
    : layoutScroll(container, options.pages, zoom);
};

/**
 * The page at a scroll offset along the layout's axis, and how far through it
 * the offset is (0 at its start, 1 at its end). An offset in the gap between
 * pages belongs to the page before it. Where pages share a slot (a spread) it
 * is the first of them.
 */
export const pageAtOffset = (
  layout: PdfLayoutResult,
  offset: number,
): PdfPagePosition => {
  const nextIndex = layout.spans.findIndex((span) => span.start > offset);
  let index = Math.max(
    0,
    nextIndex === -1 ? layout.spans.length - 1 : nextIndex - 1,
  );

  // Pages that share a slot (a spread) are read as the first of them.
  while (
    index > 0 &&
    layout.spans[index - 1]?.start === layout.spans[index]?.start
  ) {
    index -= 1;
  }

  const span = layout.spans[index];

  return {
    fraction: span
      ? clamp((offset - span.start) / Math.max(1, span.size), 0, 1)
      : 0,
    index,
  };
};

/** The scroll offsets that bring a page (and a fraction through it) to the edge. */
export const scrollOffsetForPage = (
  layout: PdfLayoutResult,
  position: PdfPagePosition,
): PdfScrollOffset => {
  const index = clamp(position.index, 0, Math.max(0, layout.spans.length - 1));
  const span = layout.spans[index];
  const offset = span
    ? span.start + clamp(position.fraction, 0, 1) * span.size
    : 0;
  const isVertical = layout.axis === 'vertical';
  const maxOffset = isVertical
    ? layout.contentHeight - layout.container.height
    : layout.contentWidth - layout.container.width;
  const clamped = clamp(offset, 0, Math.max(0, maxOffset));

  return isVertical ? { left: 0, top: clamped } : { left: clamped, top: 0 };
};

/**
 * The page a reading position belongs to when a layout shows whole pages: the
 * next page once more than half of this one has scrolled past the edge.
 * `pagesPerSlot` is how many pages the layout the position was read in puts in
 * a slot (2 in `spread`, where the position's page is the first of its pair), so
 * "the next one" is the next slot's first page.
 */
export const nearestPage = (
  position: PdfPagePosition,
  pageCount: number,
  pagesPerSlot = 1,
): number => {
  const index =
    position.fraction > 0.5 ? position.index + pagesPerSlot : position.index;

  return clamp(index, 0, Math.max(0, pageCount - 1));
};

/**
 * The page the reader is on: the one under the middle of the viewport along the
 * scrolling axis. In `pages` that is the snapped page; in a column or strip it
 * is the page that fills most of the view.
 */
export const currentPageAt = (
  layout: PdfLayoutResult,
  scrollOffset: number,
  viewportSize: number,
): number => {
  return pageAtOffset(layout, scrollOffset + viewportSize / 2).index;
};

/** A point on a page: which page, and how far across and down it (0 to 1). */
export type PdfPagePoint = { fx: number; fy: number; index: number };

/** The page under a point of the scrolled content, or undefined in a gap or margin. */
export const pointOnPage = (
  layout: PdfLayoutResult,
  x: number,
  y: number,
): PdfPagePoint | undefined => {
  const index = layout.boxes.findIndex(
    (box) =>
      x >= box.left &&
      x < box.left + box.width &&
      y >= box.top &&
      y < box.top + box.height,
  );
  const box = layout.boxes[index];

  return box
    ? { fx: (x - box.left) / box.width, fy: (y - box.top) / box.height, index }
    : undefined;
};

const clampScroll = (offset: number, content: number, view: number): number =>
  clamp(offset, 0, Math.max(0, content - view));

/**
 * The scroll offsets that put a page point back under a spot in the viewport
 * (`focal`, measured from the viewport's top left). Used after a zoom changes
 * every page's size: unlike scaling the offsets by the content's size ratio, it
 * is exact even though the gaps between pages do not scale with the zoom.
 */
export const scrollOffsetForPoint = (
  layout: PdfLayoutResult,
  point: PdfPagePoint,
  focal: { x: number; y: number },
): PdfScrollOffset => {
  const box = layout.boxes[point.index];

  if (!box) {
    return { left: 0, top: 0 };
  }

  return {
    left: clampScroll(
      box.left + point.fx * box.width - focal.x,
      layout.contentWidth,
      layout.container.width,
    ),
    top: clampScroll(
      box.top + point.fy * box.height - focal.y,
      layout.contentHeight,
      layout.container.height,
    ),
  };
};

/** The pages in view, first to last (equal when one page is). */
export type PdfPageRange = { first: number; last: number };

// A page counts as in view once this much of it is.
const MIN_VISIBLE_FRACTION = 0.5;

/**
 * The pages that are mostly in view: every page of which at least half shows
 * in the viewport. Where none is (one page bigger than the viewport), it is the
 * single page under the viewport's middle, as `currentPageAt`.
 */
export const visiblePageRange = (
  layout: PdfLayoutResult,
  scrollOffset: number,
  viewportSize: number,
): PdfPageRange => {
  const viewEnd = scrollOffset + viewportSize;
  const inView = layout.spans.flatMap((span, index) => {
    const overlap =
      Math.min(span.start + span.size, viewEnd) -
      Math.max(span.start, scrollOffset);

    return overlap / Math.max(1, span.size) >= MIN_VISIBLE_FRACTION
      ? [index]
      : [];
  });
  const first = inView[0];
  const last = inView[inView.length - 1];

  if (first === undefined || last === undefined) {
    const middle = currentPageAt(layout, scrollOffset, viewportSize);

    return { first: middle, last: middle };
  }

  return { first, last };
};
