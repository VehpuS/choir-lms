import type { PdfLayout } from '@org/audio-library-models';
import { clamp } from 'es-toolkit';

/** Where a PDF is: `page` counts from 0, `pageCount` is how many pages it has. */
export type PdfPageState = { page: number; pageCount: number };

/** A request to move to a page; `token` makes a repeat of the same page a new request. */
export type PdfPageRequest = { page: number; token: number };

export type PdfPageControls = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  /** `Page 3 of 81`; undefined until the document has pages. */
  indicator: string | undefined;
  /** `Previous page` and `Next page` show only where whole pages are turned. */
  showSteps: boolean;
};

export const formatPageIndicator = ({
  page,
  pageCount,
}: PdfPageState): string => `Page ${page + 1} of ${pageCount}`;

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
      showSteps: false,
    };
  }

  return {
    canGoNext: state.page < state.pageCount - 1,
    canGoPrevious: state.page > 0,
    indicator: formatPageIndicator(state),
    showSteps: layout === 'pages',
  };
};
