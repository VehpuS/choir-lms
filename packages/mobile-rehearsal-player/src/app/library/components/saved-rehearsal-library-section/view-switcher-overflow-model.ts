import { appTheme } from '../../../utils/theme';

// A tiny rounding/measurement slop so near-exact matches (scroll position or
// content width fractionally off due to sub-pixel layout) don't falsely
// report remaining scroll distance.
const SCROLL_EPSILON = 1;

export type HorizontalScrollEdgeFades = {
  showLeadingFade: boolean;
  showTrailingFade: boolean;
};

// Decides which edge(s) of a horizontally-scrolling row should show a
// scroll-affordance fade, based on how far the row has actually been
// scrolled — not just whether its content overflows the container. A row
// scrolled all the way to the end should stop showing a trailing fade (there
// is nothing further to reveal) and start showing a leading one instead
// (scrolling back reveals earlier content), and vice versa.
export const resolveHorizontalScrollEdgeFades = (options: {
  containerWidth: number;
  contentWidth: number;
  scrollX: number;
}): HorizontalScrollEdgeFades => {
  const maxScrollX = Math.max(options.contentWidth - options.containerWidth, 0);

  return {
    showLeadingFade: options.scrollX > SCROLL_EPSILON,
    showTrailingFade: options.scrollX < maxScrollX - SCROLL_EPSILON,
  };
};

// The fade paints the color the row sits on, so it must track the Library
// ground; the row is no longer inside a card (screen 1b).
export const VIEW_SWITCHER_EDGE_FADE_COLOR = appTheme.colors.pageBackground;
export const VIEW_SWITCHER_EDGE_FADE_WIDTH = 32;

export type HorizontalScrollEdge = 'leading' | 'trailing';

export type EdgeFadeStop = {
  offset: number;
  opacity: number;
};

// Gradient stops along the fade's own left-to-right axis: transparent where
// it meets the chips, opaque at the screen edge it is anchored to.
export const resolveEdgeFadeStops = (
  edge: HorizontalScrollEdge,
): readonly [EdgeFadeStop, EdgeFadeStop] => {
  if (edge === 'leading') {
    return [
      { offset: 0, opacity: 1 },
      { offset: 1, opacity: 0 },
    ];
  }

  return [
    { offset: 0, opacity: 0 },
    { offset: 1, opacity: 1 },
  ];
};
