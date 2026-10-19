export type SpelledPitch = { alter: number; octave: number; step: string };

export type NotationClef =
  | {
      /** MusicXML `clef-octave-change`, -1 for the tenor's treble-8 clef. */
      octaveChange?: number;
      line: number;
      sign: 'F' | 'G';
    }
  /** The unpitched clef of a drum or beatbox part. */
  | { sign: 'percussion' };

const SHARP_STEPS = [
  'C',
  'C',
  'D',
  'D',
  'E',
  'F',
  'F',
  'G',
  'G',
  'A',
  'A',
  'B',
];
const SHARP_ALTERS = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const FLAT_STEPS = ['C', 'D', 'D', 'E', 'E', 'F', 'G', 'G', 'A', 'A', 'B', 'B'];
const FLAT_ALTERS = [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0];
const PITCH_CLASSES = 12;
const MAJOR_SCALE_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);
const FIFTHS_RANGE = 7;
// Index minus 7 is the number of sharps (positive) or flats (negative).
const MAJOR_KEYS = [
  'Cb',
  'Gb',
  'Db',
  'Ab',
  'Eb',
  'Bb',
  'F',
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#',
];
// Median pitches (MIDI) that split a bass line, a tenor line, and the rest. A
// baritone line (median about 56) is written in bass clef, a tenor line (about
// 59) in treble-8, as in the real score of the audited file (task 15.5).
const BASS_CLEF_BELOW = 57;
const TENOR_CLEF_BELOW = 61;
const KEY_PREFERENCE_PER_ACCIDENTAL = 0.01;

const modulo = (value: number, size: number) => ((value % size) + size) % size;

/**
 * Names a MIDI pitch with sharps in sharp keys and flats in flat keys. Only
 * the key decides the spelling: nothing in the file says whether a black key
 * is a sharp or a flat, which is one reason the result is approximate.
 */
export const spellPitch = (midi: number, fifths: number): SpelledPitch => {
  const pitchClass = modulo(midi, PITCH_CLASSES);
  const useFlats = fifths < 0;

  return {
    alter: (useFlats ? FLAT_ALTERS : SHARP_ALTERS)[pitchClass] ?? 0,
    octave: Math.floor(midi / PITCH_CLASSES) - 1,
    step: (useFlats ? FLAT_STEPS : SHARP_STEPS)[pitchClass] ?? 'C',
  };
};

/**
 * Sharps (positive) or flats (negative) for the key name `@tonejs/midi` reads
 * from a key signature event. The library names every signature by its major
 * key, even when the event says minor (an A minor file reads as `C`), so the
 * scale is not needed and a minor key name is not looked up.
 */
export const fifthsFromKeyName = (
  key: string | undefined,
): number | undefined => {
  const index = MAJOR_KEYS.indexOf(key ?? '');

  return index === -1 ? undefined : index - FIFTHS_RANGE;
};

/**
 * Picks the key signature under which the fewest notes fall outside the
 * major scale, preferring fewer accidentals on a tie. A relative minor
 * scores like its major, which is the right signature for either.
 */
export const inferFifths = (pitches: readonly number[]): number => {
  let best = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let fifths = -6; fifths <= 6; fifths += 1) {
    const tonic = modulo(fifths * 7, PITCH_CLASSES);
    const outside = pitches.filter(
      (pitch) =>
        !MAJOR_SCALE_PITCH_CLASSES.has(modulo(pitch - tonic, PITCH_CLASSES)),
    ).length;
    const score = outside + Math.abs(fifths) * KEY_PREFERENCE_PER_ACCIDENTAL;

    if (score < bestScore) {
      bestScore = score;
      best = fifths;
    }
  }

  return best;
};

/** Bass clef for low lines, treble-8 for tenor-range lines, treble otherwise. */
export const chooseClef = (pitches: readonly number[]): NotationClef => {
  const sorted = [...pitches].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 60;

  if (median < BASS_CLEF_BELOW) {
    return { line: 4, sign: 'F' };
  }

  return median < TENOR_CLEF_BELOW
    ? { line: 2, octaveChange: -1, sign: 'G' }
    : { line: 2, sign: 'G' };
};
