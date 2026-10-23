import type { PdfLayout } from '@org/audio-library-models';

import { PDF_PAGE_GAP_PX, type PdfPageBox } from './pdf-layout-model';

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

// `pages` is laid out like `strip` until its snapping slots exist (task 2.3).
const isHorizontal = (layout: PdfLayout): boolean => layout !== 'scroll';

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

/** The style of one page's wrapper, sized from its box with the gap after it. */
export const pdfPageStyle = (layout: PdfLayout, box: PdfPageBox): string => {
  const margin = isHorizontal(layout)
    ? `0 ${PDF_PAGE_GAP_PX}px 0 0`
    : `0 0 ${PDF_PAGE_GAP_PX}px`;

  return `width:${box.width}px;height:${box.height}px;margin:${margin};${PAGE_BASE_STYLE}`;
};
