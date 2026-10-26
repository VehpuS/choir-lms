import type { PdfLayout } from '@org/audio-library-models';

export type PagingKeyEvent = {
  altKey?: boolean;
  ctrlKey?: boolean;
  /** The key is meant for a text field, not for turning pages. */
  isFromEditableTarget?: boolean;
  key: string;
  metaKey?: boolean;
};

/** The part of an element the focus rule reads. */
export type FocusTarget = {
  isContentEditable?: boolean;
  tagName?: string;
};

const TEXT_FIELD_TAGS: ReadonlySet<string> = new Set([
  'INPUT',
  'SELECT',
  'TEXTAREA',
]);

/** Whether an element takes typed text, so keys and focus are left to it. */
export const isEditableTarget = (
  target: FocusTarget | null | undefined,
): boolean =>
  target?.isContentEditable === true ||
  TEXT_FIELD_TAGS.has(target?.tagName ?? '');

/**
 * Whether the page area may take keyboard focus back (after a sheet closes or
 * a toolbar button is used): never from a text field or editable content the
 * user is typing in. `active` is the element that has focus now.
 */
export const shouldTakeFocus = (active: FocusTarget | null | undefined) =>
  !isEditableTarget(active);

const NEXT_KEYS: ReadonlySet<string> = new Set(['ArrowRight', 'PageDown']);
const PREVIOUS_KEYS: ReadonlySet<string> = new Set(['ArrowLeft', 'PageUp']);

// A wheel notch (a line or a page of delta) is turned into pixels the way the
// zoom gestures do it.
const WHEEL_DELTA_MODE_LINE = 1;
const WHEEL_DELTA_MODE_PAGE = 2;
const WHEEL_LINE_PIXELS = 16;
const FIT_EPSILON = 1e-6;

/** About one notch of a mouse wheel, so a flick of two notches turns a page. */
const WHEEL_TURN_THRESHOLD_PX = 50;
// After a turn the wheel is ignored briefly, so one flick (or a trackpad's
// coasting) turns one page rather than several.
const WHEEL_TURN_LOCK_MS = 350;
// A pause this long starts a new gesture, so slow leftovers do not add up.
const WHEEL_IDLE_RESET_MS = 200;

/**
 * How many pages a key turns: 1, -1, or 0 for a key left to the browser. Only
 * `pages` and `strip` turn pages by key; in `scroll` the browser's own arrow
 * and Page Up/Down scrolling is kept.
 */
export const pageKeyStep = (
  event: PagingKeyEvent,
  layout: PdfLayout,
): -1 | 0 | 1 => {
  if (
    layout === 'scroll' ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.isFromEditableTarget
  ) {
    return 0;
  }

  if (NEXT_KEYS.has(event.key)) {
    return 1;
  }

  return PREVIOUS_KEYS.has(event.key) ? -1 : 0;
};

export type WheelInput = {
  ctrlKey?: boolean;
  deltaMode?: number;
  deltaX?: number;
  deltaY?: number;
  metaKey?: boolean;
};

/**
 * Whether a wheel event should move the pages sideways: a plain, mostly
 * vertical wheel over `strip` or `pages` while the page is fitted (so nothing
 * scrolls vertically). `Ctrl`/`Cmd` is zoom, and a trackpad's sideways swipe
 * already scrolls sideways, so both are left alone.
 */
export const isSidewaysWheel = (
  event: WheelInput,
  layout: PdfLayout,
  zoom: number,
): boolean => {
  const deltaY = event.deltaY ?? 0;

  return (
    layout !== 'scroll' &&
    zoom <= 1 + FIT_EPSILON &&
    !event.ctrlKey &&
    !event.metaKey &&
    deltaY !== 0 &&
    Math.abs(deltaY) > Math.abs(event.deltaX ?? 0)
  );
};

/** The wheel's vertical delta in pixels; a page of delta is one viewport width. */
export const wheelDeltaPixels = (
  event: WheelInput,
  viewportWidth: number,
): number => {
  const deltaY = event.deltaY ?? 0;

  if (event.deltaMode === WHEEL_DELTA_MODE_LINE) {
    return deltaY * WHEEL_LINE_PIXELS;
  }

  return event.deltaMode === WHEEL_DELTA_MODE_PAGE
    ? deltaY * viewportWidth
    : deltaY;
};

export type WheelTurnState = {
  accumulated: number;
  lastAt: number;
  lockedUntil: number;
};

export const INITIAL_WHEEL_TURN_STATE: WheelTurnState = {
  accumulated: 0,
  lastAt: Number.NEGATIVE_INFINITY,
  lockedUntil: Number.NEGATIVE_INFINITY,
};

/**
 * Turns wheel movement into whole pages for `pages`, where a pixel nudge would
 * just snap back. Enough movement turns one page and locks the wheel briefly.
 */
export const accumulateWheelTurn = (
  state: WheelTurnState,
  deltaPixels: number,
  now: number,
): { state: WheelTurnState; step: -1 | 0 | 1 } => {
  if (now < state.lockedUntil) {
    return { state, step: 0 };
  }

  const carried =
    now - state.lastAt > WHEEL_IDLE_RESET_MS ? 0 : state.accumulated;
  const accumulated = carried + deltaPixels;

  if (Math.abs(accumulated) < WHEEL_TURN_THRESHOLD_PX) {
    return { state: { ...state, accumulated, lastAt: now }, step: 0 };
  }

  return {
    state: {
      accumulated: 0,
      lastAt: now,
      lockedUntil: now + WHEEL_TURN_LOCK_MS,
    },
    step: accumulated > 0 ? 1 : -1,
  };
};
