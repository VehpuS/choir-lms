/** How far toward the centre the pane is dragged (in points) before it opens the playback view. */
export const EXPAND_DRAG_DISTANCE = 48;
/** The most the pane's content shifts while dragged, as feedback that it is moving. */
export const MAX_DRAG_SHIFT = 28;
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

/** How far (negative, leftward) the content follows the finger: capped, and none for a vertical or outward drag. */
export const dragShiftOffset = (drag: Drag): number => {
  return isInwardDrag(drag) ? Math.max(drag.dx, -MAX_DRAG_SHIFT) : 0;
};

/** A movement past the slop is a drag, so the click that follows it is not a tap. */
export const isDrag = ({ dx, dy }: Drag): boolean => {
  return Math.hypot(dx, dy) >= DRAG_SLOP;
};
