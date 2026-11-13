const MARQUEE_CHARACTER_THRESHOLD = 24;
const MARQUEE_CHARACTER_WIDTH_PX = 8;
export const PLAYBACK_MARQUEE_GAP_PX = 28;

/**
 * Whether a long title scrolls. Never under Reduce Motion: the title then stays
 * on one line, cut off with an ellipsis (its full text is in the control's
 * accessibility label and the playback sheet), because a title that scrolls
 * forever is motion the person asked the system not to show.
 */
export const shouldAnimatePlaybackMarquee = (options: {
  enabled: boolean;
  reduceMotion?: boolean;
  text: string;
}) => {
  return (
    options.enabled &&
    !options.reduceMotion &&
    options.text.length > MARQUEE_CHARACTER_THRESHOLD
  );
};

export const getPlaybackMarqueeDistancePx = (options: {
  measuredTextWidth: number;
  text: string;
}) => {
  if (options.measuredTextWidth > 0) {
    return options.measuredTextWidth + PLAYBACK_MARQUEE_GAP_PX;
  }

  const overflowCharacterCount = Math.max(
    0,
    options.text.length - MARQUEE_CHARACTER_THRESHOLD,
  );

  return (
    overflowCharacterCount * MARQUEE_CHARACTER_WIDTH_PX +
    PLAYBACK_MARQUEE_GAP_PX
  );
};
