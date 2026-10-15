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
