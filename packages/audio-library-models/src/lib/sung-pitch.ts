/** Note math for sung pitch: frequency to note and cents, matching, accuracy. */

const SEMITONES_PER_OCTAVE = 12;
const CENTS_PER_SEMITONE = 100;
const CENTS_PER_OCTAVE = SEMITONES_PER_OCTAVE * CENTS_PER_SEMITONE;
const A4_MIDI = 69;

export const DEFAULT_REFERENCE_HZ = 440;
/** The nearest semitone: a sung pitch within this of a note is that note. */
export const MATCH_TOLERANCE_CENTS = 50;

export type SungPitch = {
  /** The nearest note. */
  midi: number;
  /** Offset from `midi`, within ±50 (positive is sharp). */
  cents: number;
};

/**
 * The nearest note and the offset from it for a frequency, relative to a
 * reference tuning for A4. Returns `null` for a frequency that is not a
 * positive number.
 */
export const frequencyToSungPitch = (
  frequencyHz: number,
  referenceHz: number = DEFAULT_REFERENCE_HZ,
): SungPitch | null => {
  if (!(frequencyHz > 0) || !(referenceHz > 0)) {
    return null;
  }

  const exactMidi =
    A4_MIDI + SEMITONES_PER_OCTAVE * Math.log2(frequencyHz / referenceHz);
  const midi = Math.round(exactMidi);

  return { midi, cents: (exactMidi - midi) * CENTS_PER_SEMITONE };
};

export type SungNoteMatch = 'exact' | 'other-octave' | null;

/**
 * Compares a sung pitch with a target note. `exact` is the same pitch within
 * the tolerance; `other-octave` is the same note name in a different octave
 * within the tolerance. Whether `other-octave` is shown is the caller's choice.
 */
export const matchSungNote = ({
  sungMidi,
  sungCents,
  targetMidi,
  toleranceCents = MATCH_TOLERANCE_CENTS,
}: {
  sungMidi: number;
  sungCents: number;
  targetMidi: number;
  toleranceCents?: number;
}): SungNoteMatch => {
  const centsAboveTarget =
    (sungMidi - targetMidi) * CENTS_PER_SEMITONE + sungCents;

  if (Math.abs(centsAboveTarget) <= toleranceCents) {
    return 'exact';
  }

  // Fold the distance to the nearest octave multiple to compare note names.
  const folded =
    ((((centsAboveTarget + CENTS_PER_OCTAVE / 2) % CENTS_PER_OCTAVE) +
      CENTS_PER_OCTAVE) %
      CENTS_PER_OCTAVE) -
    CENTS_PER_OCTAVE / 2;

  return Math.abs(folded) <= toleranceCents ? 'other-octave' : null;
};

export type CentsZone = 'precise' | 'near' | 'quarter-tone-off' | 'off-pitch';

export const PRECISE_CENTS = 10;
export const NEAR_CENTS = 25;

/** How accurate a pitch is, given its distance in cents from the target. */
export const centsZone = (cents: number): CentsZone => {
  const distance = Math.abs(cents);

  if (distance <= PRECISE_CENTS) {
    return 'precise';
  }
  if (distance <= NEAR_CENTS) {
    return 'near';
  }

  return distance <= MATCH_TOLERANCE_CENTS ? 'quarter-tone-off' : 'off-pitch';
};
