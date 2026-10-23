import type { PdfPageBox } from './pdf-layout-model';
import { computePdfRenderScale } from './pdf-page-layout';
import type {
  DomElement,
  HostElement,
  PdfPage,
  PdfRenderTask,
} from './pdf-web-types';

export type PageEntry = {
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

export type PageDrawer = {
  draw(entry: PageEntry): Promise<void>;
  release(entry: PageEntry): void;
};

/**
 * Draws and releases single pages. The size a page is drawn at comes from
 * `boxOf` (the current layout), so a layout or zoom change redraws it at the
 * new scale.
 */
export const createPageDrawer = (options: {
  boxOf: (index: number) => PdfPageBox | undefined;
  host: HostElement;
  isDisposed: () => boolean;
  pixelRatio: number;
}): PageDrawer => {
  const release = (entry: PageEntry) => {
    entry.task?.cancel();
    entry.task = undefined;
    entry.renderedScale = undefined;
    entry.wrapper.innerHTML = '';
    entry.isRendered = false;
  };

  // Draws the page at the current layout. A page that already shows a canvas at
  // another scale keeps it (stretched by CSS) until the new one is finished,
  // so a zoom change never flashes a blank page.
  const draw = async (entry: PageEntry) => {
    const box = options.boxOf(entry.index);

    if (options.isDisposed() || !box) {
      return;
    }

    const renderScale = computePdfRenderScale({
      cssHeight: box.height,
      cssWidth: box.width,
      devicePixelRatio: options.pixelRatio,
      pageWidth: entry.width,
    });

    if (entry.isRendered && entry.renderedScale === renderScale) {
      return;
    }

    entry.task?.cancel();

    const viewport = entry.page.getViewport({ scale: renderScale });
    const canvas = options.host.ownerDocument.createElement('canvas');
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

  return { draw, release };
};
