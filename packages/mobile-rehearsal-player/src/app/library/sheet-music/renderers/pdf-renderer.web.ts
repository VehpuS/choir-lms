import type { PdfContainer } from './pdf-renderer';
import type { PdfLayout } from '@org/audio-library-models';

import {
  computePdfLayout,
  currentPageAt,
  nearestPage,
  pageAtOffset,
  pointOnPage,
  scrollOffsetForPage,
  scrollOffsetForPoint,
  type PdfLayoutResult,
  type PdfPagePosition,
} from './pdf-layout-model';
import {
  isPdfSnapping,
  pdfColumnStyle,
  pdfPageStyle,
  pdfSnapType,
} from './pdf-layout-style';
import { createPageObserver } from './pdf-page-observer';
import { clampPdfZoom } from './pdf-page-layout';
import { createPageDrawer, type PageEntry } from './pdf-page-drawer';
import { drawPdfThumbnail } from './pdf-thumbnail';
import { createPageTracker } from './pdf-page-tracker';
import type { DomCanvas, HostElement, PdfDocument } from './pdf-web-types';
import { isPasswordError, openPdf } from './pdfjs-loader';
import type {
  PdfRenderer,
  PdfRenderResult,
  PdfRendering,
  PdfThumbnailTask,
} from './sheet-music-renderer';

const DEFAULT_ZOOM = 1;
const DEFAULT_LAYOUT: PdfLayout = 'scroll';
// A zoom stream (a pinch, a held wheel) redraws once, this long after the last
// change; until then the drawn canvases are stretched by the browser.
const ZOOM_SETTLE_MS = 150;

// A thumbnail that was not drawn (no such page, or the viewer is closed).
const NO_THUMBNAIL: PdfThumbnailTask = {
  // Nothing is drawing, so there is nothing to cancel.
  cancel: () => undefined,
  done: Promise.resolve(false),
};

const failed = (
  reason: 'invalid-pdf' | 'password-protected',
): PdfRenderResult => ({ reason, status: 'failed' });

/**
 * Draws a PDF into a DOM element in a layout (a column fitted to the width, or
 * a sideways strip fitted to the height). Every page has its final size from
 * the start, so the scroll length is right; a page is drawn only near the
 * viewport and released when it leaves.
 */
export const createPdfRenderer = (): PdfRenderer<PdfContainer> => ({
  async render({
    bytes,
    container,
    layout: initialLayout = DEFAULT_LAYOUT,
    onPageChange,
    zoom = DEFAULT_ZOOM,
  }) {
    const host = container as HostElement;
    let doc: PdfDocument;
    let pages: PageEntry[];

    try {
      const opened = await openPdf(bytes);

      doc = opened.doc;
      pages = opened.pages.map((size) => ({
        ...size,
        isRendered: false,
        isVisible: false,
        wrapper: host.ownerDocument.createElement('div'),
      }));
    } catch (error) {
      return failed(
        isPasswordError(error) ? 'password-protected' : 'invalid-pdf',
      );
    }

    const column = host.ownerDocument.createElement('div');
    let currentLayout = initialLayout;
    let currentZoom = clampPdfZoom(zoom);
    let isDisposed = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    // Every page's box comes from the layout model.
    const computeLayout = (): PdfLayoutResult =>
      computePdfLayout({
        container: { height: host.clientHeight, width: host.clientWidth },
        layout: currentLayout,
        pages: pages.map((entry) => ({
          height: entry.height,
          width: entry.width,
        })),
        zoom: currentZoom,
      });
    let layout = computeLayout();

    const { draw, release } = createPageDrawer({
      boxOf: (index) => layout.boxes[index],
      host,
      isDisposed: () => isDisposed,
    });

    const applyLayout = (canRetry = true): void => {
      const measured = { height: host.clientHeight, width: host.clientWidth };

      column.style.cssText = pdfColumnStyle(
        currentLayout,
        host.offsetWidth - host.clientWidth,
      );

      layout = computeLayout();

      for (const entry of pages) {
        const box = layout.boxes[entry.index];

        if (box) {
          entry.wrapper.style.cssText = pdfPageStyle(
            currentLayout,
            box,
            layout.spans[entry.index],
          );
        }
      }

      // Laying the pages out can add a scrollbar, which shrinks the host; fit
      // the pages to the size that is left instead of overflowing. One retry
      // only: a page that is borderline for needing a scrollbar could otherwise
      // flip the size back and forth.
      if (
        canRetry &&
        (host.clientWidth !== measured.width ||
          host.clientHeight !== measured.height)
      ) {
        applyLayout(false);
      }
    };

    const startObserving = () =>
      createPageObserver({
        host,
        layout: currentLayout,
        onHidden: release,
        onVisible: (entry) => {
          // While a zoom is settling the page waits for the one redraw.
          if (!settleTimer) {
            void draw(entry);
          }
        },
        pages,
      });
    let observer = startObserving();

    const observeAll = () => {
      observer?.observeAll();

      // Without IntersectionObserver every page is drawn (older browsers).
      if (!observer) {
        pages.forEach((entry) => void draw(entry));
      }
    };

    const scrollToPage = (index: number, fraction = 0) => {
      const target = scrollOffsetForPage(layout, { fraction, index });

      host.scrollLeft = target.left;
      host.scrollTop = target.top;
    };

    // Snapping is on only while a paged page is fitted. When it turns back on
    // after a zoom, the view settles on the page the reader is mostly on.
    let wasSnapping = false;
    const updateSnapping = () => {
      host.style.scrollSnapType = pdfSnapType(currentLayout, currentZoom);

      const isSnapping = isPdfSnapping(currentLayout, currentZoom);

      if (isSnapping && !wasSnapping) {
        scrollToPage(
          nearestPage(pageAtOffset(layout, host.scrollLeft), pages.length),
        );
      }

      wasSnapping = isSnapping;
    };

    const mainOffset = () =>
      layout.axis === 'vertical' ? host.scrollTop : host.scrollLeft;

    // The page at the viewport's start edge, and how far through it, are kept
    // across anything that changes the pages' sizes (zoom, a width change).
    const readAnchor = () => pageAtOffset(layout, mainOffset());

    const restoreAnchor = (anchor: PdfPagePosition) => {
      if (isPdfSnapping(currentLayout, currentZoom)) {
        scrollToPage(nearestPage(anchor, pages.length));

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

    const settleZoom = () => {
      settleTimer = undefined;

      for (const entry of pages) {
        if (!observer || entry.isVisible) {
          void draw(entry);
        } else if (entry.isRendered) {
          release(entry);
        }
      }
    };

    pages.forEach((entry) => column.appendChild(entry.wrapper));
    host.innerHTML = '';
    host.appendChild(column);
    applyLayout();
    updateSnapping();
    observeAll();

    const currentPage = () =>
      currentPageAt(
        layout,
        mainOffset(),
        layout.axis === 'vertical' ? host.clientHeight : host.clientWidth,
      );
    const tracker = createPageTracker({
      host,
      onChange: onPageChange,
      pageOf: currentPage,
    });

    // `hold` places the scroll once the pages have their new sizes; without
    // one, the page at the viewport's start edge stays where it was.
    const changeZoom = (next: number, hold?: () => void) => {
      const anchor = readAnchor();

      currentZoom = clampPdfZoom(next);
      applyLayout();
      (hold ?? (() => restoreAnchor(anchor)))();
      updateSnapping();
      tracker.check();
      clearTimeout(settleTimer);
      // Pages scrolled out of range are released by the observer as the layout
      // moves them; what stays is redrawn once the zoom stops changing.
      settleTimer = setTimeout(settleZoom, ZOOM_SETTLE_MS);
    };

    const rendering: PdfRendering = {
      currentLayout: () => currentLayout,
      currentPage,
      currentZoom: () => currentZoom,
      dispose() {
        isDisposed = true;
        tracker.dispose();
        clearTimeout(settleTimer);
        observer?.disconnect();
        pages.forEach(release);
        host.style.scrollSnapType = '';
        host.innerHTML = '';
        void doc.destroy();
      },
      drawThumbnail: (index, canvas, cssWidth) => {
        const entry = pages[index];

        return entry && !isDisposed
          ? drawPdfThumbnail({
              canvas: canvas as DomCanvas,
              cssWidth,
              page: entry.page,
            })
          : NO_THUMBNAIL;
      },
      goToPage(index) {
        scrollToPage(index);
        tracker.check();
      },
      pageCount: pages.length,
      setLayout(next) {
        if (next === currentLayout) {
          return;
        }

        const anchor = readAnchor();

        currentLayout = next;
        applyLayout();

        // Whole pages show the page the reader is mostly on, from its start.
        if (next === 'pages') {
          scrollToPage(nearestPage(anchor, pages.length));
        } else {
          scrollToPage(anchor.index, anchor.fraction);
        }

        wasSnapping = false;
        updateSnapping();

        // The look-ahead margin follows the scroll axis, so the observer is
        // rebuilt; observing again reports every page's state at the new layout.
        observer?.disconnect();
        observer = startObserving();
        observeAll();
        tracker.check();
      },
      setZoom: (next) => changeZoom(next),
      setZoomAround(next, focal) {
        // The page point under the fingers; none when they are over a gap or
        // a margin, where keeping the page in view is all that can be done.
        const point = pointOnPage(
          layout,
          host.scrollLeft + focal.x,
          host.scrollTop + focal.y,
        );

        changeZoom(
          next,
          point &&
            (() => {
              const target = scrollOffsetForPoint(layout, point, focal);

              host.scrollLeft = target.left;
              host.scrollTop = target.top;
            }),
        );
      },
    };

    return { rendering, status: 'rendered' };
  },
});
