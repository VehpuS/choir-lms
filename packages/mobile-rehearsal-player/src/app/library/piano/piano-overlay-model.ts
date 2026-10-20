import { midiToNoteName } from '@org/audio-library-models';

import {
  DEFAULT_KEYBOARD_LAYOUT,
  PIANO_HEIGHT_STEPS,
  PIANO_KEY_HEIGHTS,
  PIANO_STRIP_WIDTH,
  type PianoHeightStep,
} from './keyboard-layout';

/** The handle row: volume, the grabber, and close. */
export const PIANO_HANDLE_HEIGHT = 44;
/** The minimap beneath the keys; a drag that begins here scrolls. 44 pt is the minimum touch target. */
export const PIANO_SCROLL_STRIP_HEIGHT = 44;
const SEMITONES_PER_OCTAVE = 12;

/** Total overlay height for a step: handle row, keys, and the minimap. */
export const pianoOverlayHeight = (step: PianoHeightStep): number => {
  return (
    PIANO_HANDLE_HEIGHT + PIANO_KEY_HEIGHTS[step] + PIANO_SCROLL_STRIP_HEIGHT
  );
};

/**
 * The step actually drawn: the stored one, but no taller than `limit`. The
 * viewer on a short landscape window caps the piano at the compact step so the
 * score keeps its height, without changing the step stored for other screens.
 */
export const capHeightStep = (
  step: PianoHeightStep,
  limit: PianoHeightStep | undefined,
): PianoHeightStep => {
  if (!limit) {
    return step;
  }

  return PIANO_HEIGHT_STEPS.indexOf(step) > PIANO_HEIGHT_STEPS.indexOf(limit)
    ? limit
    : step;
};

/**
 * Where a handle drag settles. Dragging up grows the keys; the step nearest
 * the dragged height wins, so crossing the midpoint to the next step snaps to
 * it and a short drag returns to the current one.
 */
export const snapHeightStep = (
  current: PianoHeightStep,
  dragDeltaY: number,
): PianoHeightStep => {
  const draggedHeight = PIANO_KEY_HEIGHTS[current] - dragDeltaY;

  return PIANO_HEIGHT_STEPS.reduce((nearest, step) => {
    const distance = Math.abs(PIANO_KEY_HEIGHTS[step] - draggedHeight);
    const nearestDistance = Math.abs(
      PIANO_KEY_HEIGHTS[nearest] - draggedHeight,
    );

    return distance < nearestDistance ? step : nearest;
  }, current);
};

/** Keeps a scroll offset inside the strip. */
export const clampScrollLeft = (
  scrollLeft: number,
  viewportWidth: number,
  stripWidth: number = PIANO_STRIP_WIDTH,
): number => {
  return Math.min(
    Math.max(scrollLeft, 0),
    Math.max(stripWidth - viewportWidth, 0),
  );
};

/**
 * The scroll offset for a touch at `x` on the minimap, which shows all 88
 * keys across `mapWidth`; the touch centres the visible window.
 */
export const scrollLeftFromMapX = (
  x: number,
  mapWidth: number,
  viewportWidth: number,
  stripWidth: number = PIANO_STRIP_WIDTH,
): number => {
  if (mapWidth <= 0) {
    return 0;
  }

  return clampScrollLeft(
    (x / mapWidth) * stripWidth - viewportWidth / 2,
    viewportWidth,
    stripWidth,
  );
};

/** The visible window on the minimap, as fractions of its width. */
export const mapWindow = (
  scrollLeft: number,
  viewportWidth: number,
  stripWidth: number = PIANO_STRIP_WIDTH,
) => {
  const left =
    clampScrollLeft(scrollLeft, viewportWidth, stripWidth) / stripWidth;

  return {
    left,
    width: Math.min(viewportWidth / stripWidth, 1),
  };
};

export type OctaveTick = {
  /** `C4`: the label drawn on the minimap. */
  label: string;
  /** Where the C key's centre sits, as a fraction of the minimap width. */
  position: number;
};

/**
 * One tick per C on the minimap, so the strip reads as a map of the keyboard.
 * Positions are fractions of the strip, which do not change with the key width
 * (the white key count is fixed).
 */
export const octaveTicks = (): OctaveTick[] => {
  const { keys, stripWidth } = DEFAULT_KEYBOARD_LAYOUT;

  return keys
    .filter((key) => key.midi % SEMITONES_PER_OCTAVE === 0)
    .map((key) => ({
      label: midiToNoteName(key.midi, 'sharps'),
      position: (key.left + key.width / 2) / stripWidth,
    }));
};
