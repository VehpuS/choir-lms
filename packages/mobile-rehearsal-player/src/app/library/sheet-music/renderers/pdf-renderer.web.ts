import type { PdfContainer } from './pdf-renderer';
import { clampPdfZoom, computePdfPageLayout } from './pdf-page-layout';
import type {
  PdfRenderer,
  PdfRenderResult,
  PdfRendering,
} from './sheet-music-renderer';

// The app's TypeScript config carries no DOM library, so the slices of the DOM
// and of pdf.js used here are described structurally.
type DomElement = {
  appendChild(child: unknown): unknown;
  innerHTML: string;
  style: { cssText: string };
};
type DomCanvas = DomElement & {
  getContext(kind: '2d'): unknown;
  height: number;
  width: number;
};
type HostElement = DomElement & {
  clientWidth: number;
  ownerDocument: { createElement(tag: 'canvas'): DomCanvas } & {
    createElement(tag: 'div'): DomElement;
  } & {
    defaultView: {
      getComputedStyle(element: unknown): { overflowY: string };
    } | null;
  };
  parentElement: HostElement | null;
};
type ObserverEntry = { isIntersecting: boolean; target: unknown };
type PageObserver = {
  disconnect(): void;
  observe(target: unknown): void;
};
type PageObserverConstructor = new (
  callback: (entries: ObserverEntry[]) => void,
  options: { root: unknown; rootMargin: string },
) => PageObserver;

type PdfViewport = { height: number; width: number };
type PdfRenderTask = { cancel(): void; promise: Promise<unknown> };
type PdfPage = {
  getViewport(options: { scale: number }): PdfViewport;
  render(options: {
    canvasContext: unknown;
    viewport: PdfViewport;
  }): PdfRenderTask;
};
type PdfDocument = {
  destroy(): Promise<unknown>;
  getPage(pageNumber: number): Promise<PdfPage>;
  numPages: number;
};
type PdfJs = {
  getDocument(source: { data: Uint8Array }): { promise: Promise<PdfDocument> };
};

type PageEntry = {
  height: number;
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
const PAGE_GAP_PX = 12;
// Pages within one and a half screens of the viewport stay drawn, so a normal
// scroll never shows an empty page, while a long score holds only a few canvases.
const OBSERVER_ROOT_MARGIN = '150% 0px';
// A zoom stream (a pinch, a held wheel) redraws once, this long after the last
// change; until then the drawn canvases are stretched by the browser.
const ZOOM_SETTLE_MS = 150;
const PASSWORD_ERROR_NAME = 'PasswordException';
const SCROLLABLE_OVERFLOW_PATTERN = /^(auto|scroll)$/;
const COLUMN_STYLE =
  'display:flex;flex-direction:column;align-items:center;min-width:100%;width:max-content;';

let pdfjsPromise: Promise<PdfJs> | undefined;

// pdf.js and its worker are large, so they load on demand. The worker runs on
// the main thread (pdf.js's "fake worker") because the real one needs a static
// file served at a known path; spike 9.2 measured this as fast enough, and a
// real worker is the fallback if long PDFs make the page jank.
const loadPdfjs = (): Promise<PdfJs> => {
  pdfjsPromise ??= (async () => {
    const [pdfModule, workerModule] = await Promise.all([
      import('pdfjs-dist/build/pdf'),
      import('pdfjs-dist/build/pdf.worker'),
    ]);
    const worker = workerModule as {
      default?: unknown;
      WorkerMessageHandler?: unknown;
    };
    const pdf = pdfModule as { default?: PdfJs } & Partial<PdfJs>;

    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker =
      worker.WorkerMessageHandler ? worker : (worker.default ?? worker);

    return (pdf.getDocument ? pdf : pdf.default) as PdfJs;
  })().catch((error: unknown) => {
    // A failed load (offline chunk fetch) must not be cached for the session.
    pdfjsPromise = undefined;
    throw error;
  });

  return pdfjsPromise;
};

/**
 * The element the pages scroll in: the host or its nearest scrolling ancestor,
 * else null (the page itself scrolls). `rootMargin` widens only the observer's
 * root, so it must be that element for the lookahead to work: inside a scroll
 * container, a page outside its bounds is clipped with no margin.
 */
const findScrollRoot = (host: HostElement): HostElement | null => {
  const view = host.ownerDocument.defaultView;

  for (let node: HostElement | null = host; node; node = node.parentElement) {
    if (
      SCROLLABLE_OVERFLOW_PATTERN.test(
        view?.getComputedStyle(node).overflowY ?? '',
      )
    ) {
      return node;
    }
  }

  return null;
};

const isPasswordError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === PASSWORD_ERROR_NAME
  );
};

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

    const layoutOf = (entry: PageEntry) =>
      computePdfPageLayout({
        containerWidth: host.clientWidth,
        devicePixelRatio: pixelRatio,
        pageHeight: entry.height,
        pageWidth: entry.width,
        zoom: currentZoom,
      });

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

      const layout = layoutOf(entry);

      if (entry.isRendered && entry.renderedScale === layout.renderScale) {
        return;
      }

      entry.task?.cancel();

      const viewport = entry.page.getViewport({ scale: layout.renderScale });
      const canvas = host.ownerDocument.createElement('canvas');
      const hadCanvas = entry.isRendered;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.cssText = 'display:block;width:100%;height:100%;';
      entry.isRendered = true;
      entry.renderedScale = layout.renderScale;

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

      for (const entry of pages) {
        const layout = layoutOf(entry);

        entry.wrapper.style.cssText = `width:${layout.cssWidth}px;height:${layout.cssHeight}px;margin:0 0 ${PAGE_GAP_PX}px;background:#fff;flex:none;`;
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
