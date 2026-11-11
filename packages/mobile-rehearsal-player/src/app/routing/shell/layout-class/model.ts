/**
 * The shell's layout, chosen from the window and not from the device: a phone
 * held upright, a tablet and a desktop window all keep the `compact` layout;
 * a phone on its side (wide and short) gets `wide-short`. Everything that
 * arranges the shell reads this class; no screen compares widths itself.
 */
export type LayoutClass = 'compact' | 'wide-short';

export type WindowSize = {
  height: number;
  width: number;
};

// A window is wide-short from this width up and under this height.
export const WIDE_SHORT_MIN_WIDTH = 600;
export const WIDE_SHORT_MAX_HEIGHT = 500;

// Once wide-short, the window has to leave the thresholds by this much to go
// back. A soft keyboard or the browser's toolbars resizing a window that sits
// near a threshold would otherwise flip the whole layout back and forth.
export const LAYOUT_HYSTERESIS = 40;

const enters = ({ height, width }: WindowSize) =>
  width >= WIDE_SHORT_MIN_WIDTH && height < WIDE_SHORT_MAX_HEIGHT;

const stays = ({ height, width }: WindowSize) =>
  width >= WIDE_SHORT_MIN_WIDTH - LAYOUT_HYSTERESIS &&
  height < WIDE_SHORT_MAX_HEIGHT + LAYOUT_HYSTERESIS;

/**
 * The layout class for a window. `previous` is the class in use until now: a
 * window that is already wide-short stays so within the hysteresis band
 * around the thresholds; a compact one changes only at the thresholds.
 */
export const getLayoutClass = (
  size: WindowSize,
  previous: LayoutClass = 'compact',
): LayoutClass => {
  if (previous === 'wide-short') {
    return stays(size) ? 'wide-short' : 'compact';
  }

  return enters(size) ? 'wide-short' : 'compact';
};
