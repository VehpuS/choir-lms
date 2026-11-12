/** How far the sheet starts off its resting place, so the spring has a visible run. */
const COMPACT_ENTER_OFFSET = 32;
/** Far enough to leave a short window's sheet entirely when dismissed. */
const COMPACT_EXIT_OFFSET = 420;
/** The wide-short sheet enters from, and leaves toward, the trailing edge. */
const WIDE_SHORT_ENTER_OFFSET = 96;
const WIDE_SHORT_EXIT_OFFSET = 900;

export type PlaybackSurfaceMotion = {
  /** `y` for the upright bottom sheet; `x` for the wide-short sheet, which comes from the Now Playing pane at the trailing edge. */
  axis: 'x' | 'y';
  enterOffset: number;
  exitOffset: number;
};

/**
 * The playback sheet moves along the axis it is attached to: it rises from the
 * bottom upright, and in a wide-short window it slides in from the trailing
 * edge (where the Now Playing pane that opens it sits), so opening it by drag
 * or tap reads as the pane being pulled across, not as a vertical sheet.
 */
export const getPlaybackSurfaceMotion = (
  isWideShort: boolean,
): PlaybackSurfaceMotion => {
  return isWideShort
    ? {
        axis: 'x',
        enterOffset: WIDE_SHORT_ENTER_OFFSET,
        exitOffset: WIDE_SHORT_EXIT_OFFSET,
      }
    : {
        axis: 'y',
        enterOffset: COMPACT_ENTER_OFFSET,
        exitOffset: COMPACT_EXIT_OFFSET,
      };
};
