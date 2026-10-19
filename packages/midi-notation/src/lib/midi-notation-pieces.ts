import { UNITS_PER_QUARTER, isTripletAt } from './midi-notation-triplets.ts';

// Cuts a stretch of time into the written note values that make it up, with
// triplet brackets where a beat is played as a triplet.

export type NoteValue = { dotted: boolean; size: number; type: string };

// Note values in twelfths of a quarter, largest first.
const STRAIGHT_VALUES: readonly NoteValue[] = [
  { dotted: false, size: 48, type: 'whole' },
  { dotted: true, size: 36, type: 'half' },
  { dotted: false, size: 24, type: 'half' },
  { dotted: true, size: 18, type: 'quarter' },
  { dotted: false, size: 12, type: 'quarter' },
  { dotted: true, size: 9, type: 'eighth' },
  { dotted: false, size: 6, type: 'eighth' },
  { dotted: false, size: 3, type: '16th' },
];

// The same note values played three in the time of two.
const TRIPLET_VALUES: readonly NoteValue[] = [
  { dotted: false, size: 8, type: 'quarter' },
  { dotted: false, size: 4, type: 'eighth' },
  { dotted: false, size: 2, type: '16th' },
];

/** Splits a length (in twelfths) into the written note values that add up to it. */
export const splitIntoNoteValues = (
  length: number,
  isTuplet = false,
): NoteValue[] => {
  const pieces: NoteValue[] = [];
  let remaining = length;

  for (const value of isTuplet ? TRIPLET_VALUES : STRAIGHT_VALUES) {
    while (remaining >= value.size) {
      pieces.push(value);
      remaining -= value.size;
    }
  }

  return pieces;
};

type Segment = { from: number; isTuplet: boolean; to: number };

/**
 * Cuts a span at the edges of triplet windows where it begins or ends inside
 * one, so the part inside the window is written as triplets and the rest as
 * ordinary notes. A note that merely passes over a triplet window, or fills a
 * whole beat of one, stays ordinary.
 */
const splitIntoSegments = (
  from: number,
  to: number,
  tripletWindows: ReadonlySet<number>,
): Segment[] => {
  const cuts = [from];
  const startsInside =
    from % UNITS_PER_QUARTER !== 0 && isTripletAt(from, tripletWindows);
  const endsInside =
    to % UNITS_PER_QUARTER !== 0 && isTripletAt(to, tripletWindows);
  const startEdge = Math.ceil(from / UNITS_PER_QUARTER) * UNITS_PER_QUARTER;
  const endEdge = Math.floor(to / UNITS_PER_QUARTER) * UNITS_PER_QUARTER;

  if (startsInside && startEdge < to) {
    cuts.push(startEdge);
  }

  if (endsInside && endEdge > from && !cuts.includes(endEdge)) {
    cuts.push(endEdge);
  }

  cuts.push(to);

  return cuts.slice(0, -1).map((start, index) => {
    const end = cuts[index + 1] ?? to;
    const isAligned =
      start % UNITS_PER_QUARTER === 0 && end % UNITS_PER_QUARTER === 0;

    return {
      from: start,
      isTuplet: !isAligned && isTripletAt(start, tripletWindows),
      to: end,
    };
  });
};

export type Piece = NoteValue & {
  isTiedBack: boolean;
  isTiedOn: boolean;
  isTuplet: boolean;
  pitches: readonly number[];
  start: number;
  tupletStart?: boolean;
  tupletStop?: boolean;
};

/** Breaks a span into written pieces; `ties` mark a note continuing across a barline. */
export const buildPieces = (
  span: { from: number; to: number },
  pitches: readonly number[],
  ties: { fromPrevious: boolean; toNext: boolean },
  tripletWindows: ReadonlySet<number>,
): Piece[] => {
  const values = splitIntoSegments(span.from, span.to, tripletWindows).flatMap(
    (segment) => {
      let position = segment.from;

      return splitIntoNoteValues(
        segment.to - segment.from,
        segment.isTuplet,
      ).map((value) => {
        const placed = {
          ...value,
          isTuplet: segment.isTuplet,
          start: position,
        };

        position += value.size;

        return placed;
      });
    },
  );

  return values.map((value, index) => ({
    ...value,
    isTiedBack: index > 0 || ties.fromPrevious,
    isTiedOn: index < values.length - 1 || ties.toNext,
    pitches,
  }));
};

const windowOf = (piece: Piece) => Math.floor(piece.start / UNITS_PER_QUARTER);

/** Marks where each beat's run of triplet pieces begins and ends, for the bracket. */
export const markTupletBrackets = (pieces: readonly Piece[]): Piece[] => {
  const sameGroup = (a: Piece | undefined, b: Piece) =>
    a !== undefined && a.isTuplet && windowOf(a) === windowOf(b);

  return pieces.map((piece, index) => {
    if (!piece.isTuplet) {
      return piece;
    }

    return {
      ...piece,
      tupletStart: !sameGroup(pieces[index - 1], piece),
      tupletStop: !sameGroup(pieces[index + 1], piece),
    };
  });
};
