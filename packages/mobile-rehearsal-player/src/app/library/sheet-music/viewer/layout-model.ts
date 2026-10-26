/**
 * Below this window height (in points) the viewer uses its compact layout: a
 * phone held sideways is about 320 to 430 tall, and the header, two chip rows
 * and the toolbar would leave the score under a third of that. A tablet held
 * sideways (about 768) and any phone upright keep the roomy layout.
 */
export const COMPACT_VIEWER_MAX_HEIGHT = 500;

export const isCompactViewerHeight = (windowHeight: number): boolean => {
  return windowHeight < COMPACT_VIEWER_MAX_HEIGHT;
};

/**
 * Whether the viewer is compact now. While a text field has focus the soft
 * keyboard shrinks the window, which would flip an upright phone into the
 * compact layout and rebuild everything in it (a sheet's field would lose its
 * focus), so the layout holds until the field is left.
 */
export const resolveCompactViewer = (options: {
  isTyping: boolean;
  previous: boolean;
  windowHeight: number;
}): boolean => {
  return options.isTyping
    ? options.previous
    : isCompactViewerHeight(options.windowHeight);
};
