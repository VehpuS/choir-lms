// Until a row reports its real height, assume about one single-line row.
export const DEFAULT_ROW_HEIGHT = 62;
export const MIN_DRAG_STEP_DISTANCE = 44;
export const DRAG_STEP_HEIGHT_RATIO = 0.82;
export const DRAG_START_DISTANCE = 5;

export type ReorderMove = { from: number; to: number };

/** How far a drag must travel to move an item one slot. */
export const resolveDragStepDistance = (rowHeight: number): number => {
  return Math.max(rowHeight * DRAG_STEP_HEIGHT_RATIO, MIN_DRAG_STEP_DISTANCE);
};

/**
 * Turns a drag's position into slot moves: one per `stepDistance` travelled
 * from the anchor, stopping at the ends of the list. Returns the anchor to
 * carry forward, so the next event continues from where the last move landed.
 */
export const advanceDrag = (options: {
  anchor: number;
  index: number;
  itemCount: number;
  stepDistance: number;
  y: number;
}): { anchor: number; moves: ReorderMove[] } => {
  const { itemCount, stepDistance, y } = options;
  const moves: ReorderMove[] = [];
  let { anchor, index } = options;
  let delta = y - anchor;

  while (index >= 0 && Math.abs(delta) >= stepDistance) {
    const direction = delta > 0 ? 1 : -1;
    const next = Math.min(Math.max(index + direction, 0), itemCount - 1);

    if (next === index) {
      break;
    }

    moves.push({ from: index, to: next });
    index = next;
    anchor += direction * stepDistance;
    delta = y - anchor;
  }

  return { anchor, moves };
};

/** A copy of the list with one item moved; an out-of-range move changes nothing. */
export const moveItem = <Item>(
  items: readonly Item[],
  from: number,
  to: number,
): Item[] => {
  const next = [...items];

  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= next.length ||
    to >= next.length
  ) {
    return next;
  }

  const [item] = next.splice(from, 1);

  next.splice(to, 0, item);

  return next;
};
