import { midiToNoteName } from '@org/audio-library-models';

import type { KeyboardLayout } from './keyboard-layout';

export type DetectedEdge = {
  /** Which side of the keys the sung key is scrolled past. */
  side: 'left' | 'right';
  /** The note name, drawn beside the arrow. */
  label: string;
  /** What assistive technology reads. */
  spokenLabel: string;
};

export type DetectedKeys = {
  /** The key to light, only while it is in view. */
  midi: number | null;
  edge: DetectedEdge | null;
};

export const NO_DETECTED_KEYS: DetectedKeys = { midi: null, edge: null };

/**
 * Where the sung note shows on the keyboard (design Decision 5): the key
 * lights while it is in view, and a small indicator at the edge points toward
 * it while it is scrolled out. A key counts as in view when its centre is, so
 * a key half cut off at the edge does not flicker between the two.
 */
export const getDetectedKeys = ({
  sungMidi,
  layout,
  scrollLeft,
  viewportWidth,
}: {
  sungMidi: number | null;
  layout: KeyboardLayout;
  scrollLeft: number;
  viewportWidth: number;
}): DetectedKeys => {
  if (sungMidi === null || viewportWidth <= 0) {
    return NO_DETECTED_KEYS;
  }

  const key = layout.keys.find((candidate) => candidate.midi === sungMidi);

  // Outside the 88 keys there is nothing to light or point at.
  if (!key) {
    return NO_DETECTED_KEYS;
  }

  const centre = key.left + key.width / 2;

  if (centre < scrollLeft) {
    return edgeFor('left', sungMidi);
  }

  if (centre > scrollLeft + viewportWidth) {
    return edgeFor('right', sungMidi);
  }

  return { midi: sungMidi, edge: null };
};

const edgeFor = (side: DetectedEdge['side'], midi: number): DetectedKeys => {
  const label = midiToNoteName(midi);

  return {
    midi: null,
    edge: {
      side,
      label,
      spokenLabel: `Sung note ${label} is off screen to the ${side}`,
    },
  };
};
