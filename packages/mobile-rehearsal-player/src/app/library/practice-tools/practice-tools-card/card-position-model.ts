/** The card's distance from the trailing and bottom edges of the area it floats in. */
export type CardOffset = { bottom: number; right: number };
type Size = { height: number; width: number };
type Delta = { x: number; y: number };

/** Where the card first appears: the lower trailing corner, just inside the sheet. */
export const DEFAULT_CARD_OFFSET: CardOffset = { bottom: 12, right: 14 };

/** A press that moves less than this is a tap, not a drag. */
export const DRAG_TAP_SLOP = 4;

const clamp = (value: number, max: number) =>
  Math.min(Math.max(value, 0), Math.max(max, 0));

/**
 * Keeps the card whole inside the area it floats in: an offset can be zero (the
 * edge) but never negative, nor more than leaves the card's own size inside.
 * Before the area or the card is measured, the offset is left as it is.
 */
export const clampCardOffset = (
  offset: CardOffset,
  card: Size,
  container: Size,
): CardOffset => {
  if (container.width <= 0 || card.width <= 0) {
    return offset;
  }

  return {
    bottom: clamp(offset.bottom, container.height - card.height),
    right: clamp(offset.right, container.width - card.width),
  };
};

/**
 * The offset after dragging by `delta` from where the drag began. Offsets count
 * from the trailing and bottom edges, so moving right or down shrinks them.
 */
export const dragCardOffset = (
  start: CardOffset,
  delta: Delta,
  card: Size,
  container: Size,
): CardOffset => {
  return clampCardOffset(
    { bottom: start.bottom - delta.y, right: start.right - delta.x },
    card,
    container,
  );
};

export const isTapMovement = (delta: Delta): boolean => {
  return Math.hypot(delta.x, delta.y) < DRAG_TAP_SLOP;
};
