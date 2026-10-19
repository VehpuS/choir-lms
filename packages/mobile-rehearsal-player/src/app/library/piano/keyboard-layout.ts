import {
  isNaturalPitch,
  midiToNoteName,
  midiToPitchName,
  MIDDLE_C_MIDI,
  PIANO_HIGHEST_MIDI,
  PIANO_LOWEST_MIDI,
  type Accidentals,
} from '@org/audio-library-models';

export const WHITE_KEY_WIDTH = 40;
/** A black key is narrower than a white one and sits on the boundary. */
export const BLACK_KEY_WIDTH = 26;
/** How much of the keyboard height the black keys cover. */
export const BLACK_KEY_HEIGHT_RATIO = 0.62;

export type PianoHeightStep = 'compact' | 'regular' | 'tall';
export const PIANO_HEIGHT_STEPS: readonly PianoHeightStep[] = [
  'compact',
  'regular',
  'tall',
];
/** White key height in pt for each overlay height step. */
export const PIANO_KEY_HEIGHTS: Record<PianoHeightStep, number> = {
  compact: 96,
  regular: 136,
  tall: 184,
};

const C_PITCH_CLASS = 0;
const SEMITONES_PER_OCTAVE = 12;

export type PianoKey = {
  midi: number;
  isBlack: boolean;
  /** Distance from the left edge of the strip. */
  left: number;
  width: number;
};

const buildKeys = (): PianoKey[] => {
  const keys: PianoKey[] = [];
  let whiteCount = 0;

  for (let midi = PIANO_LOWEST_MIDI; midi <= PIANO_HIGHEST_MIDI; midi += 1) {
    if (isNaturalPitch(midi)) {
      keys.push({
        midi,
        isBlack: false,
        left: whiteCount * WHITE_KEY_WIDTH,
        width: WHITE_KEY_WIDTH,
      });
      whiteCount += 1;
    } else {
      keys.push({
        midi,
        isBlack: true,
        left: whiteCount * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2,
        width: BLACK_KEY_WIDTH,
      });
    }
  }

  return keys;
};

/** All 88 keys, A0 to C8, in pitch order. */
export const PIANO_KEYS: readonly PianoKey[] = buildKeys();
export const PIANO_WHITE_KEYS = PIANO_KEYS.filter((key) => !key.isBlack);
export const PIANO_BLACK_KEYS = PIANO_KEYS.filter((key) => key.isBlack);
export const PIANO_STRIP_WIDTH = PIANO_WHITE_KEYS.length * WHITE_KEY_WIDTH;

export type PianoLabelOptions = {
  showAllNoteNames: boolean;
  accidentals: Accidentals;
};

/**
 * The label a key shows: C keys carry their octave (`C4`); with every note
 * name on, other natural keys show their letter and black keys their name in
 * the chosen spelling.
 */
export const pianoKeyLabel = (
  midi: number,
  { showAllNoteNames, accidentals }: PianoLabelOptions,
): string | null => {
  if (midi % SEMITONES_PER_OCTAVE === C_PITCH_CLASS) {
    return midiToNoteName(midi, accidentals);
  }

  return showAllNoteNames ? midiToPitchName(midi, accidentals) : null;
};

const keyFor = (midi: number): PianoKey => {
  const clamped = Math.min(
    Math.max(midi, PIANO_LOWEST_MIDI),
    PIANO_HIGHEST_MIDI,
  );

  return PIANO_KEYS[clamped - PIANO_LOWEST_MIDI];
};

const keyCentre = (midi: number) => {
  const key = keyFor(midi);

  return key.left + key.width / 2;
};

/**
 * The scroll offset that centres a note range (or one note) in a viewport,
 * stopping at the ends of the strip so no empty space shows past A0 or C8.
 * A strip narrower than the viewport does not scroll.
 */
export const centredScrollOffset = (
  range: { lowest: number; highest: number },
  viewportWidth: number,
): number => {
  const maxOffset = Math.max(PIANO_STRIP_WIDTH - viewportWidth, 0);
  const centre = (keyCentre(range.lowest) + keyCentre(range.highest)) / 2;

  return Math.min(Math.max(centre - viewportWidth / 2, 0), maxOffset);
};

export const middleCScrollOffset = (viewportWidth: number): number => {
  return centredScrollOffset(
    { lowest: MIDDLE_C_MIDI, highest: MIDDLE_C_MIDI },
    viewportWidth,
  );
};
