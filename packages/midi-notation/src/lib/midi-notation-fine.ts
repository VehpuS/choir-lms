import { UNITS_PER_QUARTER } from './midi-notation-triplets.ts';

// Runs of 32nd notes sit between the 16th grid (3 units apart, in twelfths of a
// quarter): at 1.5, 4.5, 7.5, and 10.5. A beat is judged fine, like a triplet
// beat, only from exact evidence, so noise in a performed line is not mistaken
// for 32nds. Triplet beats are never fine.

/** The points inside a beat that only a 32nd grid has. */
const FINE_ONLY_POINTS = [1.5, 4.5, 7.5, 10.5];
/**
 * Close enough to a fine point to count as sitting on it: about 2 ticks at 480
 * per quarter. A score-exported file is exact, and a looser tolerance began to
 * mistake the timing noise of a performed one for 32nds (task 15.14).
 */
const ONSET_TOLERANCE = 0.05;
// Performers end notes early, never late, so an end is explained by a fine
// point shortly after it.
const END_LOOKBEHIND = 0.25;
const END_LOOKAHEAD = 0.5;
const MIN_EXACT_ONSETS_ALONE = 2;

const windowOf = (time: number) => Math.floor(time / UNITS_PER_QUARTER);

const isOnFinePoint = (offset: number) => {
  return FINE_ONLY_POINTS.some(
    (point) => Math.abs(offset - point) <= ONSET_TOLERANCE,
  );
};

const isFineEnd = (offset: number) => {
  return FINE_ONLY_POINTS.some((point) => {
    const ahead = point - offset;

    return ahead >= -END_LOOKBEHIND && ahead <= END_LOOKAHEAD;
  });
};

/**
 * Finds the quarter-note windows whose notes are 32nds, from the real,
 * unsnapped starts and ends of a line's notes. A window needs a note that
 * starts exactly on a 32nd point and either a second one or a note that ends
 * just before one: a single 32nd pair at the end of a run is one onset and one
 * end. Windows already judged triplets are left alone.
 */
export const detectFineWindows = (
  spans: ReadonlyArray<{ end: number; start: number }>,
  tripletWindows: ReadonlySet<number>,
): Set<number> => {
  const tally = new Map<number, { ends: number; onsets: number }>();
  const entry = (window: number) => {
    const existing = tally.get(window) ?? { ends: 0, onsets: 0 };

    tally.set(window, existing);

    return existing;
  };

  for (const span of spans) {
    const startWindow = windowOf(span.start);
    const endWindow = windowOf(span.end);

    if (
      !tripletWindows.has(startWindow) &&
      isOnFinePoint(span.start - startWindow * UNITS_PER_QUARTER)
    ) {
      entry(startWindow).onsets += 1;
    }

    if (
      !tripletWindows.has(endWindow) &&
      isFineEnd(span.end - endWindow * UNITS_PER_QUARTER)
    ) {
      entry(endWindow).ends += 1;
    }
  }

  const fine = new Set<number>();

  for (const [window, { ends, onsets }] of tally) {
    if (onsets >= MIN_EXACT_ONSETS_ALONE || (onsets >= 1 && ends >= 1)) {
      fine.add(window);
    }
  }

  return fine;
};

export const isFineAt = (
  time: number,
  fineWindows: ReadonlySet<number>,
): boolean => {
  return fineWindows.has(windowOf(time));
};
