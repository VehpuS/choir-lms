const MARQUEE_CHARACTER_THRESHOLD = 24;
const MARQUEE_CHARACTER_WIDTH_PX = 8;
export const PLAYBACK_MARQUEE_GAP_PX = 28;

export const shouldAnimatePlaybackMarquee = (options: {
  enabled: boolean;
  text: string;
}) => {
  return options.enabled && options.text.length > MARQUEE_CHARACTER_THRESHOLD;
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
