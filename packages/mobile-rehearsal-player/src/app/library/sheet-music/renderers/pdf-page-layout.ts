export const MIN_PDF_ZOOM = 0.5;
export const MAX_PDF_ZOOM = 4;

/** Safari caps a canvas near 16.7 million pixels; stay well under it. */
const MAX_CANVAS_PIXELS = 12_000_000;
const MAX_DEVICE_PIXEL_RATIO = 2;

export type PdfPageLayout = {
  /** The page's on-screen size in CSS pixels. */
  cssHeight: number;
  cssWidth: number;
  /** The pdf.js render scale (page units to canvas pixels). */
  renderScale: number;
};

export const clampPdfZoom = (zoom: number): number => {
  return Math.min(MAX_PDF_ZOOM, Math.max(MIN_PDF_ZOOM, zoom));
};

/**
 * The pdf.js render scale for a page shown at a CSS size. The canvas is drawn
 * at the screen's pixel ratio (up to 2x) so text stays sharp, and scaled back
 * when a big zoomed page would exceed the canvas cap.
 */
export const computePdfRenderScale = (options: {
  cssHeight: number;
  cssWidth: number;
  devicePixelRatio: number;
  pageWidth: number;
}): number => {
  const cssScale = options.cssWidth / Math.max(1, options.pageWidth);
  const pixelRatio = Math.min(
    MAX_DEVICE_PIXEL_RATIO,
    Math.max(1, options.devicePixelRatio),
  );
  const pixelBudgetRatio = Math.sqrt(
    MAX_CANVAS_PIXELS / (options.cssWidth * options.cssHeight),
  );

  return cssScale * Math.min(pixelRatio, pixelBudgetRatio);
};

/** Sizes one page for a column that fits the container's width at zoom 1. */
export const computePdfPageLayout = (options: {
  containerWidth: number;
  devicePixelRatio: number;
  pageHeight: number;
  pageWidth: number;
  zoom: number;
}): PdfPageLayout => {
  const cssWidth =
    Math.max(1, options.containerWidth) * clampPdfZoom(options.zoom);
  const cssHeight =
    options.pageHeight * (cssWidth / Math.max(1, options.pageWidth));

  return {
    cssHeight,
    cssWidth,
    renderScale: computePdfRenderScale({
      cssHeight,
      cssWidth,
      devicePixelRatio: options.devicePixelRatio,
      pageWidth: options.pageWidth,
    }),
  };
};
