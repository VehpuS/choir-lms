/**
 * The shell's stacking order, lowest first. Every view is its own stacking
 * layer on web, so a later sibling paints over an earlier one's overflow
 * unless the order is stated here. The account menu hangs from a screen header
 * and can be taller than the content left beside an open practice tool, so the
 * content has to sit above the in-flow practice dock (which keeps the default
 * layer, 0). The bottom dock sits just above the content so the practice-tools
 * menu, which opens upward from it, still covers the content.
 */
export const SHELL_LAYERS = {
  contentViewport: 10,
  bottomDock: 11,
  playbackSheet: 15,
  floatingPracticeDock: 20,
} as const;
