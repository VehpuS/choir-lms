import type { PdfContainer } from './pdf-renderer';
import type { PdfLayout } from '@org/audio-library-models';

import {
  computePdfLayout,
  nearestPage,
  pointOnPage,
  scrollOffsetForPage,
  scrollOffsetForPoint,
  type PdfLayoutResult,
} from './pdf-layout-model';
import {
  isPagedLayout,
  pdfColumnStyle,
  pdfPageStyle,
} from './pdf-layout-style';
import { pagesPerSlotOf, slotRoleOf } from './pdf-spread-layout';
import { createPageObserver } from './pdf-page-observer';
import { clampPdfZoom } from './pdf-page-layout';
import { createPageDrawer, type PageEntry } from './pdf-page-drawer';
import { drawPdfThumbnail } from './pdf-thumbnail';
import { createPageTracker } from './pdf-page-tracker';
import { createPdfPageTurner } from './pdf-page-turn';
import { applyPdfScrollbar } from './pdf-scrollbar';
import { createPdfScroller } from './pdf-scroll-position';
import type { DomCanvas, HostElement, PdfDocument } from './pdf-web-types';
import { isPasswordError, openPdf } from './pdfjs-loader';
import type {
  PdfRenderer,
  PdfRenderResult,
  PdfRendering,
} from './sheet-music-renderer';

const DEFAULT_ZOOM = 1;
const DEFAULT_LAYOUT: PdfLayout = 'scroll';
// A zoom stream (a pinch, a held wheel) redraws once, this long after the last
// change; until then the drawn canvases are stretched by the browser.
const ZOOM_SETTLE_MS = 150;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

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
      // Before measuring: a visible scrollbar takes room the pages must fit around.
      applyPdfScrollbar(host, currentLayout);

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
            slotRoleOf(layout, entry.index),
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

    const scroller = createPdfScroller({
      getState: () => ({
        currentLayout,
        currentZoom,
        layout,
        pageCount: pages.length,
      }),
      host,
    });
    const { readAnchor, restoreAnchor, scrollToPage, updateSnapping } =
      scroller;
    const turner = createPdfPageTurner({
      host,
      prefersReducedMotion: () =>
        host.ownerDocument.defaultView?.matchMedia?.(REDUCED_MOTION_QUERY)
          .matches ?? false,
      // Back on, the host's snapping follows the layout and zoom again.
      setSnapping: (isOn) => {
        if (isOn) {
          updateSnapping();
        } else {
          host.style.scrollSnapType = '';
        }
      },
    });

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

    const tracker = createPageTracker({
      host,
      onChange: onPageChange,
      rangeOf: scroller.currentRange,
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
      currentPage: scroller.currentPage,
      currentPageRange: scroller.currentRange,
      currentZoom: () => currentZoom,
      dispose() {
        isDisposed = true;
        turner.cancel();
        tracker.dispose();
        clearTimeout(settleTimer);
        observer?.disconnect();
        pages.forEach(release);
        host.style.scrollSnapType = '';
        applyPdfScrollbar(host, undefined);
        host.innerHTML = '';
        void doc.destroy();
      },
      drawThumbnail: (index, canvas, cssWidth) =>
        drawPdfThumbnail({
          canvas: canvas as DomCanvas,
          cssWidth,
          page: isDisposed ? undefined : pages[index]?.page,
        }),
      goToPage(index, options) {
        const target = scrollOffsetForPage(layout, { fraction: 0, index });

        turner.turn({ animate: options?.animate ?? false, index, ...target });
        tracker.check();
      },
      pendingPage: turner.pendingPage,
      pageCount: pages.length,
      setLayout(next) {
        if (next === currentLayout) {
          return;
        }

        const anchor = readAnchor();
        // The anchor is read in the layout being left, so its slot size counts.
        const anchorPagesPerSlot = pagesPerSlotOf(currentLayout);

        turner.cancel();
        // A new layout starts fitted; the page and in-page fraction are kept.
        currentLayout = next;
        currentZoom = DEFAULT_ZOOM;
        clearTimeout(settleTimer);
        settleTimer = undefined;
        applyLayout();

        // Whole pages (or a spread) show the page the reader is mostly on,
        // from its start; a spread's first page stands for the pair.
        if (isPagedLayout(next)) {
          scrollToPage(nearestPage(anchor, pages.length, anchorPagesPerSlot));
        } else {
          scrollToPage(anchor.index, anchor.fraction);
        }

        scroller.resetSnapping();
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
