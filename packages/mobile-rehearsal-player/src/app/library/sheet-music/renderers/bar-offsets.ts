// OpenSheetMusicDisplay lays a score out in its own units, ten pixels each at
// zoom 1, and keeps every measure's position in `GraphicSheet.MeasureList`
// (one row per bar, one entry per staff).

/** Pixels per OpenSheetMusicDisplay layout unit at zoom 1. */
export const OSMD_UNIT_PX = 10;

/** The slice of a graphical measure this module reads. */
export type GraphicMeasure = {
  PositionAndShape: { AbsolutePosition: { x: number } };
};

export type MeasureRow = readonly (GraphicMeasure | undefined)[] | undefined;

/**
 * Where each bar starts, in pixels at zoom 1 from the left of the drawing, for
 * bars `firstBar` to `lastBar` (1-based, inclusive). A hidden staff is not laid
 * out and reads as 0, so the first staff with a position stands for the bar. A
 * bar that was not drawn is left out.
 */
export const readBarOffsets = (
  measureList: readonly MeasureRow[],
  firstBar: number,
  lastBar: number,
): Map<number, number> => {
  const offsets = new Map<number, number>();

  for (let bar = firstBar; bar <= lastBar; bar += 1) {
    const x = measureList[bar - 1]?.find((measure) => {
      return (measure?.PositionAndShape.AbsolutePosition.x ?? 0) > 0;
    })?.PositionAndShape.AbsolutePosition.x;

    if (x !== undefined) {
      offsets.set(bar, x * OSMD_UNIT_PX);
    }
  }

  return offsets;
};

/** How far in from the viewport's left edge a bar is placed when jumped to. */
export const BAR_JUMP_LEAD_PX = 24;

/** The scroll position that puts a bar at the left of the viewport, never negative. */
export const computeBarScrollLeft = (options: {
  /** Pixels at zoom 1 from the left of the drawing that holds the bar. */
  barOffset: number;
  /** Where that drawing starts in the scrolling strip. */
  drawingLeft?: number;
  zoom: number;
}): number => {
  const { barOffset, drawingLeft = 0, zoom } = options;

  return Math.max(0, drawingLeft + barOffset * zoom - BAR_JUMP_LEAD_PX);
};
