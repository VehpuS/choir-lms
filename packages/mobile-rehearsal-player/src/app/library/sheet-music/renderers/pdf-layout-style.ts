import type { PdfLayout } from '@org/audio-library-models';

import {
  PDF_PAGE_GAP_PX,
  type PdfPageBox,
  type PdfPageSpan,
} from './pdf-layout-model';

// Pages within one and a half screens of the viewport stay drawn, so a normal
// scroll never shows an empty page, while a long score holds only a few
// canvases. The margin runs along the axis the pages scroll on.
const VERTICAL_OBSERVER_MARGIN = '150% 0px';
const HORIZONTAL_OBSERVER_MARGIN = '0px 150%';

const PAGE_BASE_STYLE = 'background:#fff;flex:none;';
const COLUMN_STYLE =
  'display:flex;flex-direction:column;align-items:center;min-width:100%;width:max-content;';
// Rows start at the top so a page taller than the viewer (zoomed in) can still
// be scrolled to from its top edge.
const ROW_STYLE =
  'display:flex;flex-direction:row;align-items:flex-start;min-height:100%;height:max-content;';

// `pages` and `strip` both scroll sideways in a row.
const isHorizontal = (layout: PdfLayout): boolean => layout !== 'scroll';

// A paged slot is a snap point at its start (the scroll margin widens the snap
// area from the page to its whole slot); `always` keeps a fast swipe from
// skipping a page. Aligning starts rather than centers keeps the page exactly in
// place whatever width the scrollbar gutter takes from the scrollport.
const pageSnapStyle = (slotMarginBefore: number): string =>
  `scroll-snap-align:start;scroll-snap-stop:always;scroll-margin-left:${slotMarginBefore}px;`;
const SNAP_TYPE = 'x mandatory';
const FIT_EPSILON = 1e-6;

/**
 * Whether the host snaps to pages: only in `pages` while a page is fitted (or
 * smaller). A zoomed page is bigger than its slot, so snapping would fight
 * panning.
 */
export const isPdfSnapping = (layout: PdfLayout, zoom: number): boolean => {
  return layout === 'pages' && zoom <= 1 + FIT_EPSILON;
};

/** The host's `scroll-snap-type`; empty turns snapping off. */
export const pdfSnapType = (layout: PdfLayout, zoom: number): string => {
  return isPdfSnapping(layout, zoom) ? SNAP_TYPE : '';
};

/** The `IntersectionObserver` root margin that looks ahead along the scroll axis. */
export const pdfObserverMargin = (layout: PdfLayout): string => {
  return isHorizontal(layout)
    ? HORIZONTAL_OBSERVER_MARGIN
    : VERTICAL_OBSERVER_MARGIN;
};

/** The style of the element that holds every page. */
export const pdfColumnStyle = (layout: PdfLayout): string => {
  return isHorizontal(layout) ? ROW_STYLE : COLUMN_STYLE;
};

/**
 * The style of one page's wrapper, sized from its box. `scroll` and `strip`
 * put the gap after the page; in `pages` the margins center the page in its
 * slot (`slot`), so the wrappers together fill each slot exactly.
 */
export const pdfPageStyle = (
  layout: PdfLayout,
  box: PdfPageBox,
  slot?: PdfPageSpan,
): string => {
  const size = `width:${box.width}px;height:${box.height}px;`;

  if (layout === 'pages' && slot) {
    const before = box.left - slot.start;
    const after = slot.size - box.width - before;

    return `${size}margin:${box.top}px ${after}px 0 ${before}px;${PAGE_BASE_STYLE}${pageSnapStyle(before)}`;
  }

  const margin = isHorizontal(layout)
    ? `0 ${PDF_PAGE_GAP_PX}px 0 0`
    : `0 0 ${PDF_PAGE_GAP_PX}px`;

  return `${size}margin:${margin};${PAGE_BASE_STYLE}`;
};
