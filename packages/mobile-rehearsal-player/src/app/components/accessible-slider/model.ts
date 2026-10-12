export type SliderStepDirection = 1 | -1;

const DEFAULT_STEPS_ACROSS_RANGE = 20;
const FLOAT_PRECISION = 1e6;

const roundToPrecision = (value: number) =>
  Math.round(value * FLOAT_PRECISION) / FLOAT_PRECISION;

// The value one `increment` / `decrement` accessibility action, or one arrow
// key, moves a slider to: one `step` (or a twentieth of the range when the
// slider is continuous), kept inside its bounds and free of float noise.
export const resolveSliderStep = (options: {
  current: number;
  direction: SliderStepDirection;
  maximum: number;
  minimum: number;
  step?: number;
}): number => {
  const step =
    options.step && options.step > 0
      ? options.step
      : (options.maximum - options.minimum) / DEFAULT_STEPS_ACROSS_RANGE;
  const next = options.current + options.direction * step;

  return roundToPrecision(
    Math.min(options.maximum, Math.max(options.minimum, next)),
  );
};

// Which direction a key moves a slider, or null for a key it ignores. Home and
// End jump to the ends, as for a native range input.
export const resolveSliderKey = (
  key: string,
): SliderStepDirection | 'start' | 'end' | null => {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return 1;
    case 'ArrowLeft':
    case 'ArrowDown':
      return -1;
    case 'Home':
      return 'start';
    case 'End':
      return 'end';
    default:
      return null;
  }
};
