/**
 * Notation time is counted in twelfths of a quarter note: 12 is the common
 * grid of 16ths (3 units apart) and eighth-note triplets (4 units apart).
 */
export const UNITS_PER_QUARTER = 12;
export const UNITS_PER_SIXTEENTH = 3;
export const UNITS_PER_TRIPLET_EIGHTH = 4;

// Positions within a quarter-note window. The beat edges (0 and 12) are on both
// grids, so a point there says nothing about which grid a window uses.
const STRAIGHT_ONLY_POINTS = [3, 6, 9];
const TRIPLET_ONLY_POINTS = [4, 8];
const EDGE_POINTS = [0, UNITS_PER_QUARTER];
// Performers end notes early, never late, so an end is explained by a grid
// point shortly after it. About one unit is 55 ms at 90 bpm.
const END_LOOKAHEAD = 1;
const END_LOOKBEHIND = 0.25;
// An onset about equally near both grids abstains.
const TIE_MARGIN = 0.15;
// A window is judged a triplet only with at least this many triplet votes, and
// at least twice as many as straight votes, so one loose note stays straight.
const MIN_TRIPLET_VOTES = 2;
const TRIPLET_MAJORITY = 2;

const windowOf = (time: number) => Math.floor(time / UNITS_PER_QUARTER);

type Vote = 'straight' | 'triplet' | undefined;

const nearest = (offset: number, points: readonly number[]) =>
  Math.min(...points.map((point) => Math.abs(offset - point)));

const onsetVote = (offset: number): Vote => {
  const straight = nearest(offset, STRAIGHT_ONLY_POINTS);
  const triplet = nearest(offset, TRIPLET_ONLY_POINTS);
  const edge = nearest(offset, EDGE_POINTS);

  if (
    edge <= Math.min(straight, triplet) ||
    Math.abs(straight - triplet) < TIE_MARGIN
  ) {
    return undefined;
  }

  return triplet < straight ? 'triplet' : 'straight';
};

/**
 * An end votes for the grid of the nearest point at or just after it (notes end
 * early, not late), and abstains on a tie or when that point is a beat edge.
 */
const endVote = (offset: number): Vote => {
  const candidates = [
    ...STRAIGHT_ONLY_POINTS.map((point) => ({
      point,
      vote: 'straight' as const,
    })),
    ...TRIPLET_ONLY_POINTS.map((point) => ({
      point,
      vote: 'triplet' as const,
    })),
    ...EDGE_POINTS.map((point) => ({ point, vote: undefined })),
  ]
    .filter(
      ({ point }) =>
        point >= offset - END_LOOKBEHIND && point <= offset + END_LOOKAHEAD,
    )
    .sort((a, b) => Math.abs(a.point - offset) - Math.abs(b.point - offset));
  const [best, runnerUp] = candidates;

  if (!best || best.vote === undefined) {
    return undefined;
  }

  const isTie =
    runnerUp !== undefined &&
    Math.abs(
      Math.abs(runnerUp.point - offset) - Math.abs(best.point - offset),
    ) < TIE_MARGIN;

  return isTie && runnerUp.vote !== best.vote ? undefined : best.vote;
};

/**
 * Finds the quarter-note windows (counted from time zero) whose notes are
 * triplets, from the real, unsnapped starts and ends of a line's notes. Starts
 * and ends vote for the grid they sit nearer (see above); each window is judged
 * on its own, so a line can mix straight and triplet beats. Swung eighths also
 * sit near the triplet positions and read as triplets, as in other notation
 * software.
 */
export const detectTripletWindows = (
  spans: ReadonlyArray<{ end: number; start: number }>,
): Set<number> => {
  const votes = new Map<number, { straight: number; triplet: number }>();
  const addVote = (time: number, vote: (offset: number) => Vote) => {
    const window = windowOf(time);
    const result = vote(time - window * UNITS_PER_QUARTER);

    if (result) {
      const tally = votes.get(window) ?? { straight: 0, triplet: 0 };

      tally[result] += 1;
      votes.set(window, tally);
    }
  };

  for (const span of spans) {
    addVote(span.start, onsetVote);
    addVote(span.end, endVote);
  }

  const triplets = new Set<number>();

  for (const [window, tally] of votes) {
    if (
      tally.triplet >= MIN_TRIPLET_VOTES &&
      tally.triplet >= TRIPLET_MAJORITY * tally.straight
    ) {
      triplets.add(window);
    }
  }

  return triplets;
};

export const stepOfWindow = (
  window: number,
  tripletWindows: ReadonlySet<number>,
) => {
  return tripletWindows.has(window)
    ? UNITS_PER_TRIPLET_EIGHTH
    : UNITS_PER_SIXTEENTH;
};

/** Snaps a time to the grid of the window it falls in; window edges are on both grids. */
export const snapToGrid = (
  time: number,
  tripletWindows: ReadonlySet<number>,
): number => {
  const window = windowOf(time);
  const step = stepOfWindow(window, tripletWindows);
  const start = window * UNITS_PER_QUARTER;

  return start + Math.round((time - start) / step) * step;
};

/** The first grid point after `time`, in the grid of its window. */
export const nextGridPoint = (
  time: number,
  tripletWindows: ReadonlySet<number>,
): number => {
  return time + stepOfWindow(windowOf(time), tripletWindows);
};

export const isTripletAt = (
  time: number,
  tripletWindows: ReadonlySet<number>,
): boolean => {
  return tripletWindows.has(windowOf(time));
};
