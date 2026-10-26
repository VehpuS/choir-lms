import type { PdfLayout } from '@org/audio-library-models';
import { clamp } from 'es-toolkit';

/**
 * Where a PDF is: `page` counts from 0 and is the first page in view,
 * `lastPage` the last when several are (a wide `strip`), and `pageCount` is how
 * many pages the document has.
 */
export type PdfPageState = {
  lastPage?: number;
  page: number;
  pageCount: number;
};

/** The state for the pages in view; a single page leaves `lastPage` out. */
export const pageStateOf = (
  range: { first: number; last: number },
  pageCount: number,
): PdfPageState =>
  range.last > range.first
    ? { lastPage: range.last, page: range.first, pageCount }
    : { page: range.first, pageCount };

/**
 * A request to move to a page; `token` makes a repeat of the same page a new
 * request. `animate` asks for a short slide (a one-page step), not a jump.
 */
export type PdfPageRequest = { animate: boolean; page: number; token: number };

export type PdfPageControls = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  /** `Page 3 of 81` (`Pages 3-5 of 81` with several in view); undefined until the document has pages. */
  indicator: string | undefined;
  /** `3/81` (`3-5/81`): the indicator for a narrow place such as the landscape rail. */
  shortIndicator: string | undefined;
  /** `Previous page` and `Next page` show only where whole pages are turned. */
  showSteps: boolean;
};

/** `Page 3 of 81`, or `Pages 3-5 of 81` while several pages are in view. */
export const formatPageIndicator = ({
  lastPage,
  page,
  pageCount,
}: PdfPageState): string =>
  lastPage !== undefined && lastPage > page
    ? `Pages ${page + 1}-${lastPage + 1} of ${pageCount}`
    : `Page ${page + 1} of ${pageCount}`;

/** `3/81`, or `3-5/81` while several pages are in view. */
export const formatShortPageIndicator = ({
  lastPage,
  page,
  pageCount,
}: PdfPageState): string =>
  lastPage !== undefined && lastPage > page
    ? `${page + 1}-${lastPage + 1}/${pageCount}`
    : `${page + 1}/${pageCount}`;

/** The page one step from the current one, never past either end. */
export const stepPage = (state: PdfPageState, delta: number): number => {
  return clamp(state.page + delta, 0, Math.max(0, state.pageCount - 1));
};

/** What the viewer shows for the page and how it may be turned. */
export const buildPageControls = (
  state: PdfPageState | undefined,
  layout: PdfLayout,
): PdfPageControls => {
  if (!state || state.pageCount <= 0) {
    return {
      canGoNext: false,
      canGoPrevious: false,
      indicator: undefined,
      shortIndicator: undefined,
      showSteps: false,
    };
  }

  return {
    canGoNext: state.page < state.pageCount - 1,
    canGoPrevious: state.page > 0,
    indicator: formatPageIndicator(state),
    shortIndicator: formatShortPageIndicator(state),
    showSteps: layout === 'pages',
  };
};
