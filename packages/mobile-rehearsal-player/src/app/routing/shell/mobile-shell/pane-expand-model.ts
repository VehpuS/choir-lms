/** How far up the pane is dragged (in points) before it opens the playback view. */
export const EXPAND_DRAG_DISTANCE = 48;
/** The most the pane's content lifts while dragged, as feedback that it is moving. */
export const MAX_DRAG_LIFT = 28;
/** A press that moves less than this is a tap. */
export const DRAG_SLOP = 4;

type Drag = { dx: number; dy: number };

/** An upward drag, more up than across: the way the playback view slides in. */
const isUpwardDrag = ({ dx, dy }: Drag) =>
  dy < 0 && Math.abs(dy) > Math.abs(dx);

/** Whether releasing after this drag opens the playback view. */
export const shouldExpandOnDrag = (drag: Drag): boolean => {
  return isUpwardDrag(drag) && -drag.dy >= EXPAND_DRAG_DISTANCE;
};

/** How far (negative, upward) the content follows the finger: capped, and none for a sideways or downward drag. */
export const dragLiftOffset = (drag: Drag): number => {
  return isUpwardDrag(drag) ? Math.max(drag.dy, -MAX_DRAG_LIFT) : 0;
};

/** A movement past the slop is a drag, so the click that follows it is not a tap. */
export const isDrag = ({ dx, dy }: Drag): boolean => {
  return Math.hypot(dx, dy) >= DRAG_SLOP;
};
