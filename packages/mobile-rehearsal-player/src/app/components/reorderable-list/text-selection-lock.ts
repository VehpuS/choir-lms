/**
 * Stops the page selecting text while a row is dragged; returns the release.
 * Native has no text selection to fight, so this does nothing there.
 */
export const lockTextSelection = (): (() => void) => {
  return () => undefined;
};
