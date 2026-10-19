// MIDI has no bar-line information beyond the time signature, so a score that
// opens with a pickup (anacrusis) has every bar line misplaced: the first full
// bar starts after the pickup, not at tick zero. This reads the phase of the
// bar lines from where long notes land.

/** A deviation from "no pickup" must beat the no-pickup score by this factor. */
const PICKUP_SCORE_RATIO = 1.1;
/** A phase is a guess from statistics, so it needs real music behind it. */
const MIN_NOTES = 8;
const MIN_BARS_SPANNED = 3;
/** Weights for a note starting on a bar line and on the middle of the bar. */
const BAR_LINE_WEIGHT = 3;
const HALF_BAR_WEIGHT = 1.5;

type TimedNote = { durationTicks: number; ticks: number };

/**
 * The length, in 16ths, of a pickup at the start of the file, or 0 for none.
 *
 * Each possible pickup length puts the bar lines at a different phase. A
 * phase is scored by how many notes start on a bar line (and, less, on the
 * middle of a bar), longer notes counting more, since sung music puts its
 * longer notes on strong beats. A pickup is reported only when the file really
 * begins with notes before that first bar line and its phase scores clearly
 * above the plain reading, so a file that already starts on a bar line, or a
 * single line with an ambiguous phase, is left as it is. A file with only a
 * few notes, or under three bars of music, is too little to judge and is also
 * left as it is.
 */
export const detectPickupSixteenths = (
  notes: readonly TimedNote[],
  ticksPerQuarter: number,
  barSixteenths: number,
): number => {
  if (notes.length < MIN_NOTES || barSixteenths < 2) {
    return 0;
  }

  const sixteenthTicks = ticksPerQuarter / 4;
  const scores = Array.from({ length: barSixteenths }, () => 0);
  let firstTick = Number.POSITIVE_INFINITY;
  let lastTick = 0;

  for (const note of notes) {
    const start = Math.round(note.ticks / sixteenthTicks);
    const length = Math.max(1, Math.round(note.durationTicks / sixteenthTicks));
    const weight = Math.min(length, barSixteenths / 2);

    firstTick = Math.min(firstTick, note.ticks);
    lastTick = Math.max(lastTick, note.ticks + note.durationTicks);

    for (let phase = 0; phase < barSixteenths; phase += 1) {
      const position =
        (((start - phase) % barSixteenths) + barSixteenths) % barSixteenths;

      if (position === 0) {
        scores[phase] = (scores[phase] ?? 0) + BAR_LINE_WEIGHT * weight;
      } else if (barSixteenths % 2 === 0 && position === barSixteenths / 2) {
        scores[phase] = (scores[phase] ?? 0) + HALF_BAR_WEIGHT * weight;
      }
    }
  }

  const best = scores.reduce(
    (winner, score, phase) => (score > (scores[winner] ?? 0) ? phase : winner),
    0,
  );
  const hasLeadIn = firstTick < best * sixteenthTicks;
  const spansBars =
    lastTick - firstTick >= MIN_BARS_SPANNED * barSixteenths * sixteenthTicks;

  return best > 0 &&
    hasLeadIn &&
    spansBars &&
    (scores[best] ?? 0) >= PICKUP_SCORE_RATIO * (scores[0] ?? 0)
    ? best
    : 0;
};
