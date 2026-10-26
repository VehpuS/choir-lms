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
// be scrolled to from its top edge. The row is as wide as its pages' margin
// boxes: an overflowing flex item's trailing margin is not scrollable, so
// without this the last page's slot (its centering margin) is cut short and the
// view cannot scroll that page into its snap position.
const ROW_STYLE =
  'display:flex;flex-direction:row;align-items:flex-start;min-height:100%;height:max-content;min-width:100%;width:max-content;';

// `pages`, `strip`, and `spread` all scroll sideways in a row.
const isHorizontal = (layout: PdfLayout): boolean => layout !== 'scroll';

/** Layouts that show whole pages (or pairs) and snap to them: `pages` and `spread`. */
export const isPagedLayout = (layout: PdfLayout): boolean =>
  layout === 'pages' || layout === 'spread';

// A paged slot is a snap point at its start (the scroll margin widens the snap
// area from the page to its whole slot); `always` keeps a fast swipe from
// skipping a page. Aligning starts rather than centers keeps the page exactly in
// place whatever width the scrollbar gutter takes from the scrollport.
const pageSnapStyle = (slotMarginBefore: number): string =>
  `scroll-snap-align:start;scroll-snap-stop:always;scroll-margin-left:${slotMarginBefore}px;`;
const SNAP_TYPE = 'x mandatory';
const FIT_EPSILON = 1e-6;

/**
 * Whether the host snaps to pages (or spreads): only in `pages` and `spread`
 * while the view is fitted (or smaller). A zoomed page is bigger than its slot, so snapping would fight
 * panning.
 */
export const isPdfSnapping = (layout: PdfLayout, zoom: number): boolean => {
  return isPagedLayout(layout) && zoom <= 1 + FIT_EPSILON;
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

/**
 * The style of the element that holds every page. `endPaddingPx` is extra room
 * after the last page in `pages`: the browser stops a sideways scroll short of
 * the scrollport's outer width, so a reserved scrollbar gutter would keep the
 * last slot from reaching its snap position (a sliver of the page before it
 * shows). Padding by the gutter's width makes that slot reachable.
 */
export const pdfColumnStyle = (layout: PdfLayout, endPaddingPx = 0): string => {
  if (isPagedLayout(layout) && endPaddingPx > 0) {
    return `${ROW_STYLE}padding-right:${endPaddingPx}px;`;
  }

  return isHorizontal(layout) ? ROW_STYLE : COLUMN_STYLE;
};

/** Where a page sits among the pages of its slot (`spread` has two to a slot). */
export type PdfSlotRole = { isFirst: boolean; next?: PdfPageBox };

// A spread's margins make its wrappers fill the slot exactly: the first page
// takes the centering margin before it and the gap to its partner after it, the
// second the rest of the slot after it. Only the first page is a snap point.
const spreadPageStyle = (
  box: PdfPageBox,
  slot: PdfPageSpan,
  role: PdfSlotRole,
): string => {
  const size = `width:${box.width}px;height:${box.height}px;`;
  const right = box.left + box.width;
  const after = role.next
    ? role.next.left - right
    : slot.start + slot.size - right;

  if (!role.isFirst) {
    return `${size}margin:${box.top}px ${after}px 0 0;${PAGE_BASE_STYLE}`;
  }

  const before = box.left - slot.start;

  return `${size}margin:${box.top}px ${after}px 0 ${before}px;${PAGE_BASE_STYLE}${pageSnapStyle(before)}`;
};

/**
 * The style of one page's wrapper, sized from its box. `scroll` and `strip`
 * put the gap after the page; in `pages` the margins center the page in its
 * slot (`slot`), so the wrappers together fill each slot exactly; `spread`
 * does the same for its pair (`role`).
 */
export const pdfPageStyle = (
  layout: PdfLayout,
  box: PdfPageBox,
  slot?: PdfPageSpan,
  role?: PdfSlotRole,
): string => {
  const size = `width:${box.width}px;height:${box.height}px;`;

  if (layout === 'spread' && slot && role) {
    return spreadPageStyle(box, slot, role);
  }

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
