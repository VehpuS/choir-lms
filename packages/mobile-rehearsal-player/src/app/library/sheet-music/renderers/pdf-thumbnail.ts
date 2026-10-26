import { computeThumbnailScale } from './pdf-page-layout';
import type { DomCanvas, PdfPage } from './pdf-web-types';
import type { PdfThumbnailTask } from './sheet-music-renderer';

// A thumbnail that was not drawn (no such page, or the viewer is closed).
const NO_THUMBNAIL: PdfThumbnailTask = {
  // Nothing is drawing, so there is nothing to cancel.
  cancel: () => undefined,
  done: Promise.resolve(false),
};

/**
 * Draws one page into a canvas at a thumbnail size. Cancelling (or a failed
 * render) leaves the canvas as it was and settles `done` with false, as does a
 * page that is missing (an index past the end, or a closed viewer).
 */
export const drawPdfThumbnail = (options: {
  canvas: DomCanvas;
  cssWidth: number;
  devicePixelRatio?: number;
  page: PdfPage | undefined;
}): PdfThumbnailTask => {
  const { canvas, cssWidth, page } = options;

  if (!page) {
    return NO_THUMBNAIL;
  }
  const viewport = page.getViewport({ scale: 1 });
  const scale = computeThumbnailScale({
    cssWidth,
    devicePixelRatio:
      options.devicePixelRatio ??
      (globalThis as { devicePixelRatio?: number }).devicePixelRatio ??
      1,
    pageWidth: viewport.width,
  });
  const scaled = page.getViewport({ scale });

  canvas.width = Math.floor(scaled.width);
  canvas.height = Math.floor(scaled.height);

  const task = page.render({
    canvasContext: canvas.getContext('2d'),
    viewport: scaled,
  });

  return {
    cancel: () => task.cancel(),
    done: task.promise.then(
      () => true,
      // A cancelled render rejects.
      () => false,
    ),
  };
};
