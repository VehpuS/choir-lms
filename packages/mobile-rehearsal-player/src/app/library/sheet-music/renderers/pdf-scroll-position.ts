import type { PdfLayout } from '@org/audio-library-models';

import {
  currentPageAt,
  nearestPage,
  pageAtOffset,
  scrollOffsetForPage,
  visiblePageRange,
  type PdfLayoutResult,
  type PdfPagePosition,
  type PdfPageRange,
} from './pdf-layout-model';
import { isPdfSnapping, pdfSnapType } from './pdf-layout-style';
import {
  pagesOfSpread,
  pagesPerSlotOf,
  spreadOfPage,
} from './pdf-spread-layout';

/** The part of the host element the scroller reads and moves. */
export type PdfScrollHost = {
  clientHeight: number;
  clientWidth: number;
  scrollLeft: number;
  scrollTop: number;
  style: { scrollSnapType: string };
};

/** What the scroller needs to know now; read on every call, as it changes with layout and zoom. */
export type PdfScrollState = {
  currentLayout: PdfLayout;
  currentZoom: number;
  layout: PdfLayoutResult;
  pageCount: number;
};

export type PdfScroller = {
  /** The page being read: the one under the middle of the viewport. */
  currentPage(): number;
  /**
   * The pages in view. In `strip`, where several pages show side by side, every
   * page that is mostly in view; elsewhere the one page being read.
   */
  currentRange(): PdfPageRange;
  /** The scroll offset along the layout's scrolling axis. */
  mainOffset(): number;
  /** The page at the viewport's start edge, and how far through it. */
  readAnchor(): PdfPagePosition;
  /** Forgets whether the host was snapping, so the next update settles on a page. */
  resetSnapping(): void;
  /** Puts an anchor taken before a size change back where it was. */
  restoreAnchor(anchor: PdfPagePosition): void;
  scrollToPage(index: number, fraction?: number): void;
  /** Sets snapping for the layout and zoom, settling on a page when it turns on. */
  updateSnapping(): void;
};

/** Scrolls a PDF host to pages and keeps the reader's place across size changes. */
export const createPdfScroller = (options: {
  getState: () => PdfScrollState;
  host: PdfScrollHost;
}): PdfScroller => {
  const { getState, host } = options;
  // Snapping is on only while a paged page is fitted. When it turns back on
  // after a zoom, the view settles on the page the reader is mostly on.
  let wasSnapping = false;

  const scrollToPage = (index: number, fraction = 0) => {
    const target = scrollOffsetForPage(getState().layout, { fraction, index });

    host.scrollLeft = target.left;
    host.scrollTop = target.top;
  };

  const updateSnapping = () => {
    const { currentLayout, currentZoom, layout, pageCount } = getState();

    host.style.scrollSnapType = pdfSnapType(currentLayout, currentZoom);

    const isSnapping = isPdfSnapping(currentLayout, currentZoom);

    if (isSnapping && !wasSnapping) {
      scrollToPage(
        nearestPage(
          pageAtOffset(layout, host.scrollLeft),
          pageCount,
          pagesPerSlotOf(currentLayout),
        ),
      );
    }

    wasSnapping = isSnapping;
  };

  const mainOffset = () =>
    getState().layout.axis === 'vertical' ? host.scrollTop : host.scrollLeft;

  const viewportSize = () =>
    getState().layout.axis === 'vertical'
      ? host.clientHeight
      : host.clientWidth;

  const currentPage = () =>
    currentPageAt(getState().layout, mainOffset(), viewportSize());

  const currentRange = (): PdfPageRange => {
    const { currentLayout, layout } = getState();

    if (currentLayout === 'strip') {
      return visiblePageRange(layout, mainOffset(), viewportSize());
    }

    const page = currentPage();

    // A spread shows its two pages (or a lone last one).
    if (currentLayout === 'spread') {
      return pagesOfSpread(spreadOfPage(page), getState().pageCount);
    }

    return { first: page, last: page };
  };

  // The page at the viewport's start edge, and how far through it, are kept
  // across anything that changes the pages' sizes (zoom, a width change).
  const readAnchor = () => pageAtOffset(getState().layout, mainOffset());

  const restoreAnchor = (anchor: PdfPagePosition) => {
    const { currentLayout, currentZoom, layout, pageCount } = getState();

    if (isPdfSnapping(currentLayout, currentZoom)) {
      scrollToPage(
        nearestPage(anchor, pageCount, pagesPerSlotOf(currentLayout)),
      );

      return;
    }

    // Only the scrolling axis moves; a pan across it is left alone.
    const target = scrollOffsetForPage(layout, anchor);

    if (layout.axis === 'vertical') {
      host.scrollTop = target.top;
    } else {
      host.scrollLeft = target.left;
    }
  };

  return {
    currentPage,
    currentRange,
    mainOffset,
    readAnchor,
    resetSnapping: () => {
      wasSnapping = false;
    },
    restoreAnchor,
    scrollToPage,
    updateSnapping,
  };
};
