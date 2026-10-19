import {
  PIANO_HEIGHT_STEPS,
  PIANO_KEY_HEIGHTS,
  PIANO_STRIP_WIDTH,
  type PianoHeightStep,
} from './keyboard-layout';

/** The handle row: grabber, volume, collapse, and close. */
export const PIANO_HANDLE_HEIGHT = 44;
/** The minimap beneath the keys; a drag that begins here scrolls. */
export const PIANO_SCROLL_STRIP_HEIGHT = 28;

/** Total overlay height for a step, or just the handle when collapsed. */
export const pianoOverlayHeight = (
  step: PianoHeightStep,
  isCollapsed: boolean,
): number => {
  return isCollapsed
    ? PIANO_HANDLE_HEIGHT
    : PIANO_HANDLE_HEIGHT + PIANO_KEY_HEIGHTS[step] + PIANO_SCROLL_STRIP_HEIGHT;
};

/**
 * Where a handle drag settles. Dragging up grows the keys; the step nearest
 * the dragged height wins, so crossing the midpoint to the next step snaps to
 * it and a short drag returns to the current one.
 */
export const snapHeightStep = (
  current: PianoHeightStep,
  dragDeltaY: number,
): PianoHeightStep => {
  const draggedHeight = PIANO_KEY_HEIGHTS[current] - dragDeltaY;

  return PIANO_HEIGHT_STEPS.reduce((nearest, step) => {
    const distance = Math.abs(PIANO_KEY_HEIGHTS[step] - draggedHeight);
    const nearestDistance = Math.abs(
      PIANO_KEY_HEIGHTS[nearest] - draggedHeight,
    );

    return distance < nearestDistance ? step : nearest;
  }, current);
};

/** Keeps a scroll offset inside the strip. */
export const clampScrollLeft = (
  scrollLeft: number,
  viewportWidth: number,
): number => {
  return Math.min(
    Math.max(scrollLeft, 0),
    Math.max(PIANO_STRIP_WIDTH - viewportWidth, 0),
  );
};

/**
 * The scroll offset for a touch at `x` on the minimap, which shows all 88
 * keys across `mapWidth`; the touch centres the visible window.
 */
export const scrollLeftFromMapX = (
  x: number,
  mapWidth: number,
  viewportWidth: number,
): number => {
  if (mapWidth <= 0) {
    return 0;
  }

  return clampScrollLeft(
    (x / mapWidth) * PIANO_STRIP_WIDTH - viewportWidth / 2,
    viewportWidth,
  );
};

/** The visible window on the minimap, as fractions of its width. */
export const mapWindow = (scrollLeft: number, viewportWidth: number) => {
  const left = clampScrollLeft(scrollLeft, viewportWidth) / PIANO_STRIP_WIDTH;

  return {
    left,
    width: Math.min(viewportWidth / PIANO_STRIP_WIDTH, 1),
  };
};
