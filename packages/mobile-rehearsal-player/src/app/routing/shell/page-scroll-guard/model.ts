/** A fraction of a point of scroll is rounding, not a shifted page. */
const SCROLL_TOLERANCE = 0.5;

export type PageScrollState = {
  /** A text field has focus: iOS moves the page to keep it above the keyboard, which is wanted. */
  isEditing: boolean;
  scrollX: number;
  scrollY: number;
};

/**
 * Whether the page itself has been scrolled and should be put back at 0, 0. The
 * app fills the window and scrolls only inside its own lists, and the body is
 * `overflow: hidden`, so a page that has moved (iOS does this in a home-screen
 * web app after a rotation, a focus or a toolbar change) leaves a gap at an
 * edge that nothing the person can do will scroll back.
 */
export const shouldResetPageScroll = ({
  isEditing,
  scrollX,
  scrollY,
}: PageScrollState): boolean => {
  if (isEditing) {
    return false;
  }

  return (
    Math.abs(scrollX) > SCROLL_TOLERANCE || Math.abs(scrollY) > SCROLL_TOLERANCE
  );
};
