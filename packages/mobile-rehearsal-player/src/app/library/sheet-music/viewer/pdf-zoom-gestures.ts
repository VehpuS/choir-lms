import { VIEWER_MAX_PDF_ZOOM, limitViewerZoom } from './model';

// Chrome reports a trackpad pinch as many small `Ctrl` + wheel events, and a
// mouse wheel notch as one large one, so the delta is capped to keep a notch
// from jumping a quarter of the range.
const WHEEL_ZOOM_SENSITIVITY = 0.01;
const MAX_WHEEL_DELTA = 30;
const WHEEL_LINE_PIXELS = 16;
const WHEEL_PAGE_PIXELS = 100;
const WHEEL_DELTA_MODE_LINE = 1;
const WHEEL_DELTA_MODE_PAGE = 2;

/** A double tap or click toggles between fitting the width and a size that is readable. */
export const FIT_TO_WIDTH_ZOOM = 1;
export const READABLE_PDF_ZOOM = 2;
const AT_FIT_TOLERANCE = 0.05;

export const DOUBLE_TAP_MAX_MS = 300;
export const DOUBLE_TAP_MAX_DISTANCE_PX = 30;

export type Point = { x: number; y: number };
export type TimedPoint = Point & { time: number };
export type Size = { height: number; width: number };

/** The zoom after a `Ctrl` + wheel event (a trackpad pinch or a mouse wheel). */
export const zoomAfterWheel = (options: {
  deltaMode: number;
  deltaY: number;
  max?: number;
  zoom: number;
}): number => {
  const pixels =
    options.deltaMode === WHEEL_DELTA_MODE_LINE
      ? options.deltaY * WHEEL_LINE_PIXELS
      : options.deltaMode === WHEEL_DELTA_MODE_PAGE
        ? options.deltaY * WHEEL_PAGE_PIXELS
        : options.deltaY;
  const capped = Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, pixels));

  return limitViewerZoom(
    options.zoom * Math.exp(-capped * WHEEL_ZOOM_SENSITIVITY),
    options.max ?? VIEWER_MAX_PDF_ZOOM,
  );
};

/** The zoom for two fingers now `distance` apart, having started `startDistance` apart. */
export const zoomAfterPinch = (options: {
  distance: number;
  max?: number;
  startDistance: number;
  startZoom: number;
}): number => {
  if (options.startDistance <= 0) {
    return limitViewerZoom(options.startZoom, options.max);
  }

  return limitViewerZoom(
    options.startZoom * (options.distance / options.startDistance),
    options.max ?? VIEWER_MAX_PDF_ZOOM,
  );
};

export const distanceBetween = (a: Point, b: Point): number => {
  return Math.hypot(a.x - b.x, a.y - b.y);
};

export const midpointOf = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/**
 * Where to scroll so the point under the fingers stays put while the pages
 * change size. `focal` is measured from the scroll element's top left, and the
 * sizes are the scrollable content's before and after the zoom, so the gaps
 * between pages are accounted for rather than assumed to scale.
 */
export const focalScrollOffset = (options: {
  after: Size;
  before: Size;
  focal: Point;
  scroll: { left: number; top: number };
}): { left: number; top: number } => {
  const { after, before, focal, scroll } = options;
  const widthRatio = before.width > 0 ? after.width / before.width : 1;
  const heightRatio = before.height > 0 ? after.height / before.height : 1;

  return {
    left: Math.max(0, (scroll.left + focal.x) * widthRatio - focal.x),
    top: Math.max(0, (scroll.top + focal.y) * heightRatio - focal.y),
  };
};

/** Back to fitting the width when zoomed in; to a readable size when already fitted. */
export const doubleTapZoom = (zoom: number, max?: number): number => {
  return limitViewerZoom(
    Math.abs(zoom - FIT_TO_WIDTH_ZOOM) <= AT_FIT_TOLERANCE
      ? READABLE_PDF_ZOOM
      : FIT_TO_WIDTH_ZOOM,
    max ?? VIEWER_MAX_PDF_ZOOM,
  );
};

/** True when `current` follows `previous` closely enough in time and place. */
export const isDoubleTap = (
  previous: TimedPoint | undefined,
  current: TimedPoint,
): boolean => {
  return (
    previous !== undefined &&
    current.time - previous.time <= DOUBLE_TAP_MAX_MS &&
    distanceBetween(previous, current) <= DOUBLE_TAP_MAX_DISTANCE_PX
  );
};
