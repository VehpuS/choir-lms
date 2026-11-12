/** How far toward the centre the pane is dragged (in points) before it opens the playback view. */
export const EXPAND_DRAG_DISTANCE = 48;
/**
 * The furthest the pane can be pulled toward the centre however far the finger
 * goes: its travel slows as it nears this, like a rubber band, instead of
 * stopping dead at a cap.
 */
export const MAX_DRAG_SHIFT = 120;
/** A press that moves less than this is a tap. */
export const DRAG_SLOP = 4;

type Drag = { dx: number; dy: number };

/**
 * A leftward drag, more across than up or down. The pane sits at the window's
 * trailing edge, so dragging it left pulls it toward the centre of the window.
 */
const isInwardDrag = ({ dx, dy }: Drag) =>
  dx < 0 && Math.abs(dx) > Math.abs(dy);

/** Whether releasing after this drag opens the playback view. */
export const shouldExpandOnDrag = (drag: Drag): boolean => {
  return isInwardDrag(drag) && -drag.dx >= EXPAND_DRAG_DISTANCE;
};

/**
 * How far (negative, leftward) the whole pane follows the finger. It tracks the
 * finger closely at first (a slope of one), then resists more and more, never
 * passing `MAX_DRAG_SHIFT`; none for a vertical or outward drag.
 */
export const dragShiftOffset = (drag: Drag): number => {
  if (!isInwardDrag(drag)) {
    return 0;
  }

  const travel = -drag.dx;

  return -(MAX_DRAG_SHIFT * travel) / (travel + MAX_DRAG_SHIFT);
};

/** A movement past the slop is a drag, so the click that follows it is not a tap. */
export const isDrag = ({ dx, dy }: Drag): boolean => {
  return Math.hypot(dx, dy) >= DRAG_SLOP;
};

/**
 * Only the primary pointer starts a drag: the main mouse button (a right-click
 * opens the browser's menu) or the first finger (a second one is a pinch or a
 * stray palm, not a drag of the pane).
 */
export const canStartPaneDrag = ({
  button,
  isPrimary,
}: {
  button: number;
  isPrimary: boolean;
}): boolean => {
  return button === 0 && isPrimary;
};
