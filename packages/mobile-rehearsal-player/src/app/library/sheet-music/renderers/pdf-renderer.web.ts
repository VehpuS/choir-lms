import type { PdfContainer } from './pdf-renderer';
import {
  PDF_PAGE_GAP_PX,
  computePdfLayout,
  type PdfLayoutResult,
} from './pdf-layout-model';
import { clampPdfZoom, computePdfRenderScale } from './pdf-page-layout';
import type {
  DomElement,
  HostElement,
  PageObserverConstructor,
  PdfDocument,
  PdfPage,
  PdfRenderTask,
} from './pdf-web-types';
import { findScrollRoot } from './pdf-scroll-root';
import { isPasswordError, loadPdfjs } from './pdfjs-loader';
import type {
  PdfRenderer,
  PdfRenderResult,
  PdfRendering,
} from './sheet-music-renderer';

type PageEntry = {
  height: number;
  index: number;
  isRendered: boolean;
  isVisible: boolean;
  page: PdfPage;
  /** The pdf.js render scale of the canvas on screen (or being drawn). */
  renderedScale?: number;
  task?: PdfRenderTask;
  width: number;
  wrapper: DomElement;
};

const DEFAULT_ZOOM = 1;
// Pages within one and a half screens of the viewport stay drawn, so a normal
// scroll never shows an empty page, while a long score holds only a few canvases.
const OBSERVER_ROOT_MARGIN = '150% 0px';
// A zoom stream (a pinch, a held wheel) redraws once, this long after the last
// change; until then the drawn canvases are stretched by the browser.
const ZOOM_SETTLE_MS = 150;
const COLUMN_STYLE =
  'display:flex;flex-direction:column;align-items:center;min-width:100%;width:max-content;';

const failed = (
  reason: 'invalid-pdf' | 'password-protected',
): PdfRenderResult => ({ reason, status: 'failed' });

/**
 * Draws a PDF into a DOM element as a column of pages that fits the element's
 * width. Every page has its final size from the start, so the scroll length is
 * right; a page is drawn only near the viewport and released when it leaves.
 */
export const createPdfRenderer = (): PdfRenderer<PdfContainer> => ({
  async render({ bytes, container, zoom = DEFAULT_ZOOM }) {
    const host = container as HostElement;
    let doc: PdfDocument;
    let pages: PageEntry[];

    try {
      const pdfjs = await loadPdfjs();

      // pdf.js may take ownership of the buffer, so it gets its own copy.
      doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
      pages = await Promise.all(
        Array.from({ length: doc.numPages }, async (_, index) => {
          const page = await doc.getPage(index + 1);
          const size = page.getViewport({ scale: 1 });

          return {
            height: size.height,
            index,
            isRendered: false,
            isVisible: false,
            page,
            width: size.width,
            wrapper: host.ownerDocument.createElement('div'),
          };
        }),
      );
    } catch (error) {
      return failed(
        isPasswordError(error) ? 'password-protected' : 'invalid-pdf',
      );
    }

    const column = host.ownerDocument.createElement('div');
    const pixelRatio =
      (globalThis as { devicePixelRatio?: number }).devicePixelRatio ?? 1;
    let currentZoom = clampPdfZoom(zoom);
    let isDisposed = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    // Every page's box comes from the layout model; only `scroll` exists so far.
    const computeLayout = (): PdfLayoutResult =>
      computePdfLayout({
        container: { height: host.clientHeight, width: host.clientWidth },
        layout: 'scroll',
        pages: pages.map((entry) => ({
          height: entry.height,
          width: entry.width,
        })),
        zoom: currentZoom,
      });
    let layout = computeLayout();

    const release = (entry: PageEntry) => {
      entry.task?.cancel();
      entry.task = undefined;
      entry.renderedScale = undefined;
      entry.wrapper.innerHTML = '';
      entry.isRendered = false;
    };

    // Draws the page at the current zoom. A page that already shows a canvas at
    // another scale keeps it (stretched by CSS) until the new one is finished,
    // so a zoom change never flashes a blank page.
    const draw = async (entry: PageEntry) => {
      if (isDisposed) {
        return;
      }

      const box = layout.boxes[entry.index];

      if (!box) {
        return;
      }

      const renderScale = computePdfRenderScale({
        cssHeight: box.height,
        cssWidth: box.width,
        devicePixelRatio: pixelRatio,
        pageWidth: entry.width,
      });

      if (entry.isRendered && entry.renderedScale === renderScale) {
        return;
      }

      entry.task?.cancel();

      const viewport = entry.page.getViewport({ scale: renderScale });
      const canvas = host.ownerDocument.createElement('canvas');
      const hadCanvas = entry.isRendered;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.cssText = 'display:block;width:100%;height:100%;';
      entry.isRendered = true;
      entry.renderedScale = renderScale;

      if (!hadCanvas) {
        entry.wrapper.appendChild(canvas);
      }

      const task = entry.page.render({
        canvasContext: canvas.getContext('2d'),
        viewport,
      });

      entry.task = task;

      try {
        await task.promise;
      } catch {
        // A cancelled render rejects: the page was released or drawn again.
        return;
      }

      if (hadCanvas && entry.task === task) {
        entry.wrapper.innerHTML = '';
        entry.wrapper.appendChild(canvas);
      }
    };

    const applyLayout = (canRetry = true): void => {
      const measuredWidth = host.clientWidth;

      layout = computeLayout();

      for (const entry of pages) {
        const box = layout.boxes[entry.index];

        entry.wrapper.style.cssText = `width:${box?.width}px;height:${box?.height}px;margin:0 0 ${PDF_PAGE_GAP_PX}px;background:#fff;flex:none;`;
      }

      // Laying the pages out can add a vertical scrollbar, which narrows the
      // host; fit the pages to the width that is left instead of overflowing.
      // One retry only: a page that is borderline for needing a scrollbar could
      // otherwise flip the width back and forth.
      if (canRetry && host.clientWidth !== measuredWidth) {
        applyLayout(false);
      }
    };

    const Observer = (
      globalThis as { IntersectionObserver?: PageObserverConstructor }
    ).IntersectionObserver;
    const entryByWrapper = new Map<unknown, PageEntry>(
      pages.map((entry) => [entry.wrapper, entry]),
    );
    const observer = Observer
      ? new Observer(
          (changes) => {
            for (const change of changes) {
              const entry = entryByWrapper.get(change.target);

              if (!entry) {
                continue;
              }

              entry.isVisible = change.isIntersecting;

              if (change.isIntersecting) {
                // While a zoom is settling the page waits for the one redraw.
                if (!settleTimer) {
                  void draw(entry);
                }
              } else {
                release(entry);
              }
            }
          },
          { root: findScrollRoot(host), rootMargin: OBSERVER_ROOT_MARGIN },
        )
      : undefined;

    // Observing reports every page's state now and again whenever a layout
    // change moves one in or out of range.
    const observeAll = () => {
      for (const entry of pages) {
        entry.isVisible = false;
        observer?.observe(entry.wrapper);
      }

      // Without IntersectionObserver every page is drawn (older browsers).
      if (!observer) {
        pages.forEach((entry) => void draw(entry));
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

    column.style.cssText = COLUMN_STYLE;
    pages.forEach((entry) => column.appendChild(entry.wrapper));
    host.innerHTML = '';
    host.appendChild(column);
    applyLayout();
    observeAll();

    const rendering: PdfRendering = {
      currentZoom: () => currentZoom,
      dispose() {
        isDisposed = true;
        clearTimeout(settleTimer);
        observer?.disconnect();
        pages.forEach(release);
        host.innerHTML = '';
        void doc.destroy();
      },
      pageCount: pages.length,
      setZoom(next) {
        currentZoom = clampPdfZoom(next);
        applyLayout();
        clearTimeout(settleTimer);
        // Pages scrolled out of range are released by the observer as the
        // layout moves them; what stays is redrawn once the zoom stops changing.
        settleTimer = setTimeout(settleZoom, ZOOM_SETTLE_MS);
      },
    };

    return { rendering, status: 'rendered' };
  },
});
