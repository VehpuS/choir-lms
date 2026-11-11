/**
 * Below this much missing height the visual viewport is not a soft keyboard
 * (the browser's address bar or toolbar sliding in and out takes up to about
 * 100 points); the shortest iPhone keyboard, in landscape, is about 160.
 */
export const MIN_KEYBOARD_INSET = 120;

/** A pinch-zoomed page also shrinks the visual viewport; that is not a keyboard. */
const ZOOM_TOLERANCE = 0.01;

type VisualViewportReading = {
  /** The layout viewport's height, which a soft keyboard does not change on iOS. */
  layoutHeight: number;
  offsetTop: number;
  scale: number;
  visualHeight: number;
};

/**
 * How much of the bottom of the layout viewport a soft keyboard covers, from
 * the visual viewport (iOS Safari shrinks it and leaves the layout viewport
 * alone, so a bottom-anchored sheet would sit under the keyboard). Zero when
 * the shortfall is the browser chrome or a pinch zoom rather than a keyboard.
 */
export const getKeyboardInset = ({
  layoutHeight,
  offsetTop,
  scale,
  visualHeight,
}: VisualViewportReading): number => {
  if (Math.abs(scale - 1) > ZOOM_TOLERANCE) {
    return 0;
  }

  const covered = layoutHeight - visualHeight - offsetTop;

  return covered >= MIN_KEYBOARD_INSET ? Math.round(covered) : 0;
};
