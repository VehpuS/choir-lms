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
  const maxScrollX = Math.max(
    options.contentWidth - options.containerWidth,
    0,
  );

  return {
    showLeadingFade: options.scrollX > SCROLL_EPSILON,
    showTrailingFade: options.scrollX < maxScrollX - SCROLL_EPSILON,
  };
};
