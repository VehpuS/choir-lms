import type { PdfLayout } from '@org/audio-library-models';

// Two pages need to stay readable side by side: a page narrower than this is
// too small to read music on, so `spread` is not offered below two of them.
export const MIN_SPREAD_PAGE_WIDTH_PX = 360;
// Room around the pair (the gap between the pages and the viewer's margins).
const SPREAD_MARGIN_PX = 40;
const PAGES_IN_SPREAD = 2;

/** The narrowest viewer in which `spread` is offered. */
export const MIN_SPREAD_VIEWER_WIDTH_PX =
  MIN_SPREAD_PAGE_WIDTH_PX * PAGES_IN_SPREAD + SPREAD_MARGIN_PX;

/**
 * Whether the viewer is wide enough to show two readable pages. Width only: a
 * wide window of any height qualifies, and the user can still pick `pages`.
 */
export const isSpreadAvailable = (container: { width: number }): boolean =>
  container.width >= MIN_SPREAD_VIEWER_WIDTH_PX;

/**
 * The layout the viewer shows: a stored `spread` shows as `pages` while the
 * viewer is too narrow, without rewriting what is stored, so the choice returns
 * when the viewer is wide enough again.
 */
export const resolveEffectivePdfLayout = (
  layout: PdfLayout,
  isSpreadFitting: boolean,
): PdfLayout => (layout === 'spread' && !isSpreadFitting ? 'pages' : layout);
