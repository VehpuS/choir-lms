import {
  isNaturalPitch,
  midiToNoteName,
  midiToPitchName,
  MIDDLE_C_MIDI,
  PIANO_HIGHEST_MIDI,
  PIANO_LOWEST_MIDI,
  type Accidentals,
} from '@org/audio-library-models';

/** The white key width in pt: the default, and the narrowest the slider allows. */
export const MIN_WHITE_KEY_WIDTH = 40;
export const DEFAULT_WHITE_KEY_WIDTH = MIN_WHITE_KEY_WIDTH;
/** The widest white key the key width slider allows (2.5x the default). */
export const MAX_WHITE_KEY_WIDTH = 100;
/** A black key is narrower than a white one and sits on the boundary. */
const BLACK_TO_WHITE_WIDTH_RATIO = 0.65;
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

/** Clamps a white key width into the slider's range; a non-number gets the default. */
export const clampWhiteKeyWidth = (width: number): number => {
  if (!Number.isFinite(width)) {
    return DEFAULT_WHITE_KEY_WIDTH;
  }

  return Math.min(Math.max(width, MIN_WHITE_KEY_WIDTH), MAX_WHITE_KEY_WIDTH);
};

export type KeyboardLayout = {
  /** All 88 keys, A0 to C8, in pitch order. */
  keys: readonly PianoKey[];
  whiteKeys: readonly PianoKey[];
  blackKeys: readonly PianoKey[];
  whiteKeyWidth: number;
  blackKeyWidth: number;
  /** The width of the whole strip: every white key side by side. */
  stripWidth: number;
};

/** Lays the 88 keys out for a white key width (clamped into the allowed range). */
export const createKeyboardLayout = (whiteKeyWidth: number): KeyboardLayout => {
  const whiteWidth = clampWhiteKeyWidth(whiteKeyWidth);
  const blackWidth = whiteWidth * BLACK_TO_WHITE_WIDTH_RATIO;
  const keys: PianoKey[] = [];
  let whiteCount = 0;

  for (let midi = PIANO_LOWEST_MIDI; midi <= PIANO_HIGHEST_MIDI; midi += 1) {
    if (isNaturalPitch(midi)) {
      keys.push({
        midi,
        isBlack: false,
        left: whiteCount * whiteWidth,
        width: whiteWidth,
      });
      whiteCount += 1;
    } else {
      keys.push({
        midi,
        isBlack: true,
        left: whiteCount * whiteWidth - blackWidth / 2,
        width: blackWidth,
      });
    }
  }

  return {
    keys,
    whiteKeys: keys.filter((key) => !key.isBlack),
    blackKeys: keys.filter((key) => key.isBlack),
    whiteKeyWidth: whiteWidth,
    blackKeyWidth: blackWidth,
    stripWidth: whiteCount * whiteWidth,
  };
};

/** The layout at the default width, for callers that do not take a width yet. */
export const DEFAULT_KEYBOARD_LAYOUT = createKeyboardLayout(
  DEFAULT_WHITE_KEY_WIDTH,
);
export const PIANO_KEYS = DEFAULT_KEYBOARD_LAYOUT.keys;
export const PIANO_WHITE_KEYS = DEFAULT_KEYBOARD_LAYOUT.whiteKeys;
export const PIANO_BLACK_KEYS = DEFAULT_KEYBOARD_LAYOUT.blackKeys;
export const WHITE_KEY_WIDTH = DEFAULT_KEYBOARD_LAYOUT.whiteKeyWidth;
export const BLACK_KEY_WIDTH = DEFAULT_KEYBOARD_LAYOUT.blackKeyWidth;
export const PIANO_STRIP_WIDTH = DEFAULT_KEYBOARD_LAYOUT.stripWidth;

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

const keyFor = (layout: KeyboardLayout, midi: number): PianoKey => {
  const clamped = Math.min(
    Math.max(midi, PIANO_LOWEST_MIDI),
    PIANO_HIGHEST_MIDI,
  );

  return layout.keys[clamped - PIANO_LOWEST_MIDI];
};

const keyCentre = (layout: KeyboardLayout, midi: number) => {
  const key = keyFor(layout, midi);

  return key.left + key.width / 2;
};

/** The scroll offset range a strip allows; a strip narrower than the view does not scroll. */
const clampOffset = (
  offset: number,
  stripWidth: number,
  viewportWidth: number,
) => {
  return Math.min(Math.max(offset, 0), Math.max(stripWidth - viewportWidth, 0));
};

/**
 * The scroll offset that centres a note range (or one note) in a viewport,
 * stopping at the ends of the strip so no empty space shows past A0 or C8.
 * A strip narrower than the viewport does not scroll.
 */
export const centredScrollOffset = (
  range: { lowest: number; highest: number },
  viewportWidth: number,
  layout: KeyboardLayout = DEFAULT_KEYBOARD_LAYOUT,
): number => {
  const centre =
    (keyCentre(layout, range.lowest) + keyCentre(layout, range.highest)) / 2;

  return clampOffset(
    centre - viewportWidth / 2,
    layout.stripWidth,
    viewportWidth,
  );
};

export const middleCScrollOffset = (
  viewportWidth: number,
  layout: KeyboardLayout = DEFAULT_KEYBOARD_LAYOUT,
): number => {
  return centredScrollOffset(
    { lowest: MIDDLE_C_MIDI, highest: MIDDLE_C_MIDI },
    viewportWidth,
    layout,
  );
};

/**
 * The scroll offset to use after the white key width changes, so the point at
 * the centre of the view stays at the centre (the user keeps their place).
 * The strip scales with the key width, so the centre scales with it. A view
 * at either end of the keyboard stays at that end, and the result is clamped
 * so no empty space shows past either end.
 */
export const rescaledScrollOffset = ({
  from,
  scrollLeft,
  to,
  viewportWidth,
}: {
  from: KeyboardLayout;
  scrollLeft: number;
  to: KeyboardLayout;
  viewportWidth: number;
}): number => {
  const fromMax = Math.max(from.stripWidth - viewportWidth, 0);
  const toMax = Math.max(to.stripWidth - viewportWidth, 0);
  const offset = clampOffset(scrollLeft, from.stripWidth, viewportWidth);

  if (offset === 0) {
    return 0;
  }

  if (offset === fromMax) {
    return toMax;
  }

  const centre = offset + viewportWidth / 2;
  const rescaledCentre = (centre / from.stripWidth) * to.stripWidth;

  return clampOffset(
    rescaledCentre - viewportWidth / 2,
    to.stripWidth,
    viewportWidth,
  );
};
