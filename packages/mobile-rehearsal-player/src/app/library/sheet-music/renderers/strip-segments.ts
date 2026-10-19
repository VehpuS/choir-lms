// The maths behind the segmented score strip: a long score is drawn as fixed
// runs of bars laid side by side, and only the runs near the viewport are
// drawn. Everything here is plain numbers, so it is specced without a browser.

/** Bars per drawn run. A run of this many bars is far under OSMD's 32,768 px limit. */
export const SEGMENT_BARS = 32;

/**
 * Scores up to this many bars are drawn as one strip, exactly as before; the
 * common arrangement never pays for segmenting. Longer ones are segmented.
 */
export const SEGMENTING_THRESHOLD_BARS = 96;

/** How far past the viewport, in viewports, a run is kept drawn. */
export const DRAW_LOOKAHEAD_VIEWPORTS = 1.5;

/** Drawn runs farther than this many runs from every wanted run are released. */
export const KEEP_DRAWN_DISTANCE = 3;

export type StripSegment = {
  barCount: number;
  /** 1-based number of the run's first bar. */
  firstBar: number;
  index: number;
  /** 1-based number of the run's last bar. */
  lastBar: number;
};

export const shouldSegment = (totalBars: number): boolean => {
  return totalBars > SEGMENTING_THRESHOLD_BARS;
};

/** Splits `totalBars` into consecutive runs of `segmentBars` (the last may be shorter). */
export const planSegments = (
  totalBars: number,
  segmentBars: number = SEGMENT_BARS,
): StripSegment[] => {
  const segments: StripSegment[] = [];

  for (let first = 1; first <= totalBars; first += segmentBars) {
    const last = Math.min(first + segmentBars - 1, totalBars);

    segments.push({
      barCount: last - first + 1,
      firstBar: first,
      index: segments.length,
      lastBar: last,
    });
  }

  return segments;
};

/** The index of the run holding 1-based bar `bar`, or undefined when out of range. */
export const findSegmentForBar = (
  segments: readonly StripSegment[],
  bar: number,
): number | undefined => {
  return segments.find(({ firstBar, lastBar }) => {
    return bar >= firstBar && bar <= lastBar;
  })?.index;
};

/** The average width of a bar over the runs measured so far, or undefined with none. */
export const estimateBarWidth = (
  measured: readonly { barCount: number; width: number }[],
): number | undefined => {
  const bars = measured.reduce((sum, { barCount }) => sum + barCount, 0);

  if (bars === 0) {
    return undefined;
  }

  return measured.reduce((sum, { width }) => sum + width, 0) / bars;
};

/** The left edge of each run, given every run's width. */
export const layoutOffsets = (widths: readonly number[]): number[] => {
  let left = 0;

  return widths.map((width) => {
    const offset = left;

    left += width;

    return offset;
  });
};

/**
 * The runs to have drawn: those within `lookaheadViewports` viewports of the
 * visible window, nearest the window's start first so what is on screen draws
 * before what is merely ahead.
 */
export const selectSegmentsToDraw = (options: {
  lookaheadViewports?: number;
  scrollLeft: number;
  viewportWidth: number;
  widths: readonly number[];
}): number[] => {
  const { lookaheadViewports = DRAW_LOOKAHEAD_VIEWPORTS } = options;
  const margin = options.viewportWidth * lookaheadViewports;
  const windowStart = options.scrollLeft - margin;
  const windowEnd = options.scrollLeft + options.viewportWidth + margin;
  const offsets = layoutOffsets(options.widths);
  const wanted: number[] = [];

  options.widths.forEach((width, index) => {
    const left = offsets[index] ?? 0;

    if (left + width > windowStart && left < windowEnd) {
      wanted.push(index);
    }
  });

  // On-screen runs first, then the ones ahead, then the ones behind.
  const onScreen = (index: number) => {
    const left = offsets[index] ?? 0;
    const width = options.widths[index] ?? 0;

    return (
      left + width > options.scrollLeft &&
      left < options.scrollLeft + options.viewportWidth
    );
  };

  return [
    ...wanted.filter(onScreen),
    ...wanted.filter((index) => {
      return !onScreen(index) && (offsets[index] ?? 0) >= options.scrollLeft;
    }),
    ...wanted.filter((index) => {
      return !onScreen(index) && (offsets[index] ?? 0) < options.scrollLeft;
    }),
  ];
};

/** Drawn runs far from everything wanted, which can be released to free memory. */
export const selectSegmentsToRelease = (options: {
  drawn: readonly number[];
  keepDistance?: number;
  wanted: readonly number[];
}): number[] => {
  const { keepDistance = KEEP_DRAWN_DISTANCE } = options;

  return options.drawn.filter((index) => {
    return !options.wanted.some((wantedIndex) => {
      return Math.abs(wantedIndex - index) <= keepDistance;
    });
  });
};

/**
 * How far to move the scroll position when run widths change (an estimate
 * replaced by a drawn size, or every run rescaled). A change to the left of the
 * viewport pushes everything on screen sideways, so the scroll moves by the
 * same amount and the bars being read stay still; a change at or to the right
 * of the viewport's left edge changes nothing. `oldWidths` is the layout the
 * scroll position was measured against.
 */
export const computeScrollAdjustment = (options: {
  newWidths: readonly number[];
  oldWidths: readonly number[];
  scrollLeft: number;
}): number => {
  const offsets = layoutOffsets(options.oldWidths);
  let adjustment = 0;

  options.oldWidths.forEach((oldWidth, index) => {
    const right = (offsets[index] ?? 0) + oldWidth;

    if (right <= options.scrollLeft) {
      adjustment += (options.newWidths[index] ?? oldWidth) - oldWidth;
    }
  });

  return adjustment;
};
