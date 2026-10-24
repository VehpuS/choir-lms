import { limitViewerZoom } from './model';
import {
  distanceBetween,
  doubleTapZoom,
  focalScrollOffset,
  isDoubleTap,
  midpointOf,
  zoomAfterPinch,
  zoomAfterWheel,
  type Point,
  type TimedPoint,
} from './pdf-zoom-gestures';

// The app's TypeScript config carries no DOM library, so the slice of the DOM
// used here is described structurally.
type TouchPoint = { clientX: number; clientY: number };
type GestureEvent = {
  clientX: number;
  clientY: number;
  preventDefault(): void;
  scale: number;
};
type DomEvent = {
  changedTouches?: ArrayLike<TouchPoint>;
  clientX: number;
  clientY: number;
  ctrlKey?: boolean;
  deltaMode?: number;
  deltaY?: number;
  preventDefault(): void;
  touches?: ArrayLike<TouchPoint>;
};
type Listener = (event: never) => void;

export type GestureHost = {
  addEventListener(
    type: string,
    listener: Listener,
    options?: { passive: boolean },
  ): void;
  getBoundingClientRect(): { left: number; top: number };
  removeEventListener(type: string, listener: Listener): void;
  scrollHeight: number;
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  style: { touchAction: string };
};

/** What the gestures drive: the drawn PDF, and the viewer's zoom readout. */
export type PdfZoomTarget = {
  currentZoom(): number;
  setZoom(zoom: number): void;
  /**
   * Zooms keeping the page point under `focal` in place. A target that has it
   * places the scroll itself; one without it is scrolled here by the ratio of
   * its content's measured sizes.
   */
  setZoomAround?(zoom: number, focal: Point): void;
};

export type PdfZoomGestureOptions = {
  host: GestureHost;
  max: number;
  now?: () => number;
  onZoomChange: (zoom: number) => void;
  pdf: PdfZoomTarget;
  /** Replaceable in specs; defaults to `requestAnimationFrame`. */
  requestFrame?: (callback: () => void) => void;
};

// A finger that moves further than this between touch start and end was a
// scroll, not a tap.
const TAP_SLOP_PX = 10;
// A touch double tap is followed by a `dblclick` on many browsers; it is
// ignored for this long so one double tap toggles once.
const TOUCH_DBLCLICK_GUARD_MS = 600;
const ALLOW_PAN_ONLY = 'pan-x pan-y';

// Without `requestAnimationFrame` (an old browser) the change is applied at once.
const requestBrowserFrame = (callback: () => void): void => {
  const request = (
    globalThis as { requestAnimationFrame?: (cb: () => void) => unknown }
  ).requestAnimationFrame;

  if (request) {
    request(callback);
  } else {
    callback();
  }
};

const toPoint = (touch: TouchPoint): Point => ({
  x: touch.clientX,
  y: touch.clientY,
});

/**
 * Lets a PDF be zoomed directly: a two-finger pinch, `Ctrl` or `Cmd` + wheel
 * (which is how a trackpad pinch arrives), Safari's gesture events, and a
 * double tap or click that toggles between fit-to-width and a readable size.
 * The point under the fingers is kept in place. Changes are applied at most
 * once a frame, and the page itself is kept from zooming. Returns a function
 * that removes everything it added.
 */
export const attachPdfZoomGestures = ({
  host,
  max,
  now = () => Date.now(),
  onZoomChange,
  pdf,
  requestFrame = requestBrowserFrame,
}: PdfZoomGestureOptions): (() => void) => {
  let pending: { focal: Point; zoom: number } | undefined;
  let isFrameQueued = false;
  let pinch: { startDistance: number; startZoom: number } | undefined;
  let safariStartZoom = 0;
  let lastTap: TimedPoint | undefined;
  let tapStart: Point | undefined;
  let didTouchMove = false;
  // Set once a pinch begins and cleared when every finger is up, so the finger
  // that lifts last is not taken for a tap.
  let didPinch = false;
  let lastTouchDoubleTapAt = Number.NEGATIVE_INFINITY;
  const previousTouchAction = host.style.touchAction;

  const focalOf = (clientX: number, clientY: number): Point => {
    const rect = host.getBoundingClientRect();

    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const apply = ({ focal, zoom }: { focal: Point; zoom: number }) => {
    const next = limitViewerZoom(zoom, max);

    if (next === pdf.currentZoom()) {
      return;
    }

    if (pdf.setZoomAround) {
      pdf.setZoomAround(next, focal);
    } else {
      const before = { height: host.scrollHeight, width: host.scrollWidth };
      const scroll = { left: host.scrollLeft, top: host.scrollTop };

      pdf.setZoom(next);

      const offset = focalScrollOffset({
        after: { height: host.scrollHeight, width: host.scrollWidth },
        before,
        focal,
        scroll,
      });

      host.scrollLeft = offset.left;
      host.scrollTop = offset.top;
    }

    onZoomChange(next);
  };

  // Many events can arrive within a frame; only the latest zoom is drawn.
  const schedule = (zoom: number, focal: Point) => {
    pending = { focal, zoom };

    if (isFrameQueued) {
      return;
    }

    isFrameQueued = true;
    requestFrame(() => {
      isFrameQueued = false;

      if (pending) {
        const request = pending;

        pending = undefined;
        apply(request);
      }
    });
  };

  // Wheel events pile up faster than frames, so each builds on the zoom
  // already asked for rather than the one last drawn.
  const zoomNow = () => pending?.zoom ?? pdf.currentZoom();

  const onWheel = (event: DomEvent) => {
    if (!event.ctrlKey) {
      return;
    }

    event.preventDefault();
    schedule(
      zoomAfterWheel({
        deltaMode: event.deltaMode ?? 0,
        deltaY: event.deltaY ?? 0,
        max,
        zoom: zoomNow(),
      }),
      focalOf(event.clientX, event.clientY),
    );
  };

  const onTouchStart = (event: DomEvent) => {
    const touches = event.touches;

    if (touches && touches.length === 2 && touches[0] && touches[1]) {
      didPinch = true;
      pinch = {
        startDistance: distanceBetween(
          toPoint(touches[0]),
          toPoint(touches[1]),
        ),
        startZoom: zoomNow(),
      };
      event.preventDefault();

      return;
    }

    if (touches && touches.length === 1 && touches[0]) {
      tapStart = toPoint(touches[0]);
      didTouchMove = false;
    }
  };

  const onTouchMove = (event: DomEvent) => {
    const touches = event.touches;

    if (pinch && touches && touches.length === 2 && touches[0] && touches[1]) {
      const a = toPoint(touches[0]);
      const b = toPoint(touches[1]);
      const middle = midpointOf(a, b);

      event.preventDefault();
      schedule(
        zoomAfterPinch({
          distance: distanceBetween(a, b),
          max,
          startDistance: pinch.startDistance,
          startZoom: pinch.startZoom,
        }),
        focalOf(middle.x, middle.y),
      );

      return;
    }

    const touch = touches?.[0];

    if (
      tapStart &&
      touch &&
      distanceBetween(tapStart, toPoint(touch)) > TAP_SLOP_PX
    ) {
      didTouchMove = true;
    }
  };

  const onTouchEnd = (event: DomEvent) => {
    const remaining = event.touches?.length ?? 0;
    const touch = event.changedTouches?.[0];
    const wasPinch = didPinch;

    if (remaining < 2) {
      pinch = undefined;
    }

    if (remaining === 0) {
      didPinch = false;
    }

    // A tap is one finger that went down and up in place, not the end of a
    // pinch or a scroll.
    if (wasPinch || remaining > 0 || didTouchMove || !touch) {
      return;
    }

    const tap = { ...toPoint(touch), time: now() };

    if (!isDoubleTap(lastTap, tap)) {
      lastTap = tap;

      return;
    }

    lastTap = undefined;
    lastTouchDoubleTapAt = tap.time;
    event.preventDefault();
    schedule(doubleTapZoom(zoomNow(), max), focalOf(tap.x, tap.y));
  };

  const onDoubleClick = (event: DomEvent) => {
    if (now() - lastTouchDoubleTapAt < TOUCH_DBLCLICK_GUARD_MS) {
      return;
    }

    event.preventDefault();
    schedule(
      doubleTapZoom(zoomNow(), max),
      focalOf(event.clientX, event.clientY),
    );
  };

  const onGestureStart = (event: GestureEvent) => {
    event.preventDefault();
    safariStartZoom = zoomNow();
  };

  const onGestureChange = (event: GestureEvent) => {
    event.preventDefault();
    schedule(
      zoomAfterPinch({
        distance: event.scale,
        max,
        startDistance: 1,
        startZoom: safariStartZoom,
      }),
      focalOf(event.clientX, event.clientY),
    );
  };

  const listeners: Array<[string, Listener, { passive: boolean }?]> = [
    ['wheel', onWheel as Listener, { passive: false }],
    ['touchstart', onTouchStart as Listener, { passive: false }],
    ['touchmove', onTouchMove as Listener, { passive: false }],
    ['touchend', onTouchEnd as Listener, { passive: false }],
    ['touchcancel', onTouchEnd as Listener, { passive: false }],
    ['dblclick', onDoubleClick as Listener],
    ['gesturestart', onGestureStart as Listener, { passive: false }],
    ['gesturechange', onGestureChange as Listener, { passive: false }],
  ];

  // Scrolling stays with the browser; pinch and double tap are ours, so the
  // page itself never zooms.
  host.style.touchAction = ALLOW_PAN_ONLY;
  listeners.forEach(([type, listener, options]) =>
    host.addEventListener(type, listener, options),
  );

  return () => {
    pending = undefined;
    listeners.forEach(([type, listener]) =>
      host.removeEventListener(type, listener),
    );
    host.style.touchAction = previousTouchAction;
  };
};
