import { median } from 'es-toolkit';

export const DEFAULT_SMOOTHING_FRAMES = 5;

export type MedianSmoother = {
  /** Adds a value and returns the median of the most recent ones. */
  push: (value: number) => number;
  reset: () => void;
};

/**
 * A running median over the last `size` values. A median rejects the lone
 * octave error or wobble that a mean would smear into a wrong note.
 */
export const createMedianSmoother = (
  size: number = DEFAULT_SMOOTHING_FRAMES,
): MedianSmoother => {
  let window: number[] = [];

  return {
    push: (value) => {
      window = [...window, value].slice(-size);

      return median(window);
    },
    reset: () => {
      window = [];
    },
  };
};
