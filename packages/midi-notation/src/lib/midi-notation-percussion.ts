// A drum part has no pitch: each note number names a sound (kick, snare, hi-hat)
// and is written on a line or space by convention, with an x head for cymbals.
// A beatbox part in a score-exported MIDI uses the General MIDI drum map.

export type DrumPosition = {
  /** The position on the staff, as MusicXML `display-step` and `display-octave`. */
  displayOctave: number;
  displayStep: string;
  /** `x` for cymbals and hi-hats; absent for a drum head. */
  notehead?: 'x';
};

const KICK: DrumPosition = { displayOctave: 4, displayStep: 'E' };
const SNARE: DrumPosition = { displayOctave: 5, displayStep: 'C' };
const HI_HAT: DrumPosition = {
  displayOctave: 5,
  displayStep: 'G',
  notehead: 'x',
};
const CRASH: DrumPosition = {
  displayOctave: 5,
  displayStep: 'A',
  notehead: 'x',
};

/**
 * General MIDI drum notes to staff positions. The kick, snare, closed and pedal
 * hi-hat, low-mid tom, and ride are the positions the real score of the audited
 * file uses (task 15.5); the others follow the same layout: toms rise from the
 * kick, cymbals sit above the staff with an x head.
 */
const GM_DRUM_POSITIONS: Readonly<Record<number, DrumPosition>> = {
  35: KICK,
  36: KICK,
  37: { displayOctave: 5, displayStep: 'C', notehead: 'x' },
  38: SNARE,
  39: { displayOctave: 5, displayStep: 'D', notehead: 'x' },
  40: SNARE,
  41: { displayOctave: 4, displayStep: 'F' },
  42: HI_HAT,
  43: { displayOctave: 4, displayStep: 'G' },
  44: { displayOctave: 4, displayStep: 'D', notehead: 'x' },
  45: { displayOctave: 4, displayStep: 'B' },
  46: HI_HAT,
  47: { displayOctave: 5, displayStep: 'D' },
  48: { displayOctave: 5, displayStep: 'E' },
  49: CRASH,
  50: { displayOctave: 5, displayStep: 'F' },
  51: { displayOctave: 5, displayStep: 'F', notehead: 'x' },
  52: CRASH,
  53: { displayOctave: 5, displayStep: 'F', notehead: 'x' },
  55: CRASH,
  57: CRASH,
  59: { displayOctave: 5, displayStep: 'F', notehead: 'x' },
};

// Staff positions, low to high, that any other note number cycles through so
// two different sounds never share a position by accident of the table.
const FALLBACK_POSITIONS: readonly DrumPosition[] = [
  { displayOctave: 4, displayStep: 'E' },
  { displayOctave: 4, displayStep: 'F' },
  { displayOctave: 4, displayStep: 'G' },
  { displayOctave: 4, displayStep: 'A' },
  { displayOctave: 4, displayStep: 'B' },
  { displayOctave: 5, displayStep: 'C' },
  { displayOctave: 5, displayStep: 'D' },
  { displayOctave: 5, displayStep: 'E' },
];

/** Where a drum note number is written on the percussion staff. */
export const drumPosition = (midiNote: number): DrumPosition => {
  return (
    GM_DRUM_POSITIONS[midiNote] ??
    FALLBACK_POSITIONS[midiNote % FALLBACK_POSITIONS.length] ??
    KICK
  );
};

type TimedNote = { durationTicks: number; midi: number; ticks: number };

/**
 * A drum hit has no meaningful length (a sample just plays), so each hit lasts
 * until the next one, at most a quarter note. Hits that start together get the
 * same length, so they are written as one chord in one voice.
 */
export const normalizeHitLengths = <Note extends TimedNote>(
  notes: readonly Note[],
  ticksPerQuarter: number,
): Note[] => {
  const onsets = [...new Set(notes.map((note) => note.ticks))].sort(
    (a, b) => a - b,
  );
  const lengthAt = new Map<number, number>();

  onsets.forEach((onset, index) => {
    const next = onsets[index + 1];

    lengthAt.set(
      onset,
      next === undefined
        ? ticksPerQuarter
        : Math.min(next - onset, ticksPerQuarter),
    );
  });

  return notes.map((note) => ({
    ...note,
    durationTicks: lengthAt.get(note.ticks) ?? ticksPerQuarter,
  }));
};
