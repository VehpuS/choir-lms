/** Lowest and highest keys on an 88-key piano: A0 and C8. */
export const PIANO_LOWEST_MIDI = 21;
export const PIANO_HIGHEST_MIDI = 108;
export const MIDDLE_C_MIDI = 60;

const SEMITONES_PER_OCTAVE = 12;
const A4_MIDI = 69;
const A4_FREQUENCY_HZ = 440;
/** MIDI octave numbering puts middle C (60) in octave 4, so C-1 is 0. */
const MIDI_OCTAVE_OFFSET = 1;

export type Accidentals = 'sharps' | 'flats';

const SHARP_NAMES = [
  'C',
  'C♯',
  'D',
  'D♯',
  'E',
  'F',
  'F♯',
  'G',
  'G♯',
  'A',
  'A♯',
  'B',
] as const;
const FLAT_NAMES = [
  'C',
  'D♭',
  'D',
  'E♭',
  'E',
  'F',
  'G♭',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
] as const;
const NATURAL_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);
/** Semitone offset of each natural step above C. */
const STEP_SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const pitchClassOf = (midi: number) => {
  return (
    ((midi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) %
    SEMITONES_PER_OCTAVE
  );
};

export const isNaturalPitch = (midi: number): boolean => {
  return NATURAL_PITCH_CLASSES.has(pitchClassOf(midi));
};

/** The note letter and accidental without an octave, e.g. `B♭`. */
export const midiToPitchName = (
  midi: number,
  accidentals: Accidentals = 'sharps',
): string => {
  const names = accidentals === 'flats' ? FLAT_NAMES : SHARP_NAMES;

  return names[pitchClassOf(midi)];
};

/** The note name with its octave, e.g. `C4` for 60 and `A0` for 21. */
export const midiToNoteName = (
  midi: number,
  accidentals: Accidentals = 'sharps',
): string => {
  const octave = Math.floor(midi / SEMITONES_PER_OCTAVE) - MIDI_OCTAVE_OFFSET;

  return `${midiToPitchName(midi, accidentals)}${octave}`;
};

/** Concert pitch, A4 = 440 Hz, equal temperament. */
export const midiToFrequency = (midi: number): number => {
  return A4_FREQUENCY_HZ * 2 ** ((midi - A4_MIDI) / SEMITONES_PER_OCTAVE);
};

export type MusicXmlPitch = {
  /** `C`–`B`. */
  step: string;
  /** Semitones above (+) or below (−) the step, e.g. `-1` for a flat. */
  alter?: number;
  octave: number;
};

export type MusicXmlTranspose = {
  chromatic?: number;
  octaveChange?: number;
};

/** A part's `<transpose>` as a whole number of semitones. */
const transposeSemitones = (transpose?: MusicXmlTranspose): number => {
  return (
    (transpose?.chromatic ?? 0) +
    (transpose?.octaveChange ?? 0) * SEMITONES_PER_OCTAVE
  );
};

/**
 * The sounding MIDI number for a pitch given as semitones above C within its
 * octave (C = 0 … B = 11), an accidental in semitones, and the MusicXML
 * octave number. Renderers that already resolved the letter to a semitone use
 * this directly.
 */
export const semitonePitchToMidi = (
  pitch: { semitone: number; alter?: number; octave: number },
  transpose?: MusicXmlTranspose,
): number => {
  return (
    (pitch.octave + MIDI_OCTAVE_OFFSET) * SEMITONES_PER_OCTAVE +
    pitch.semitone +
    (pitch.alter ?? 0) +
    transposeSemitones(transpose)
  );
};

/**
 * The sounding MIDI number for a written pitch. A part's `<transpose>` says
 * how far its written notes sit from what is heard, so it is added to the
 * written pitch; vocal parts normally have none. Returns `null` for a step
 * that is not a note letter.
 */
export const musicXmlPitchToMidi = (
  pitch: MusicXmlPitch,
  transpose?: MusicXmlTranspose,
): number | null => {
  const semitone = STEP_SEMITONES[pitch.step];

  if (semitone === undefined) {
    return null;
  }

  return semitonePitchToMidi(
    { semitone, alter: pitch.alter, octave: pitch.octave },
    transpose,
  );
};
