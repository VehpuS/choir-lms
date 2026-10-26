import type { PdfLayout } from '@org/audio-library-models';
import { useCallback, useState } from 'react';

import {
  buildPageControls,
  stepPage,
  type PdfPageRequest,
  type PdfPageState,
} from './pdf-page-controls-model';

/**
 * Which page the open PDF is on, what the page controls show for it, and the
 * latest request to move. The page belongs to one source, so a different
 * source starts with none until its PDF reports one.
 */
export const usePdfPageControl = (options: {
  layout: PdfLayout;
  sourceKey: string | undefined;
}) => {
  const [reported, setReported] = useState<{
    sourceKey: string | undefined;
    state: PdfPageState;
  }>();
  const [request, setRequest] = useState<PdfPageRequest>();
  const state =
    reported && reported.sourceKey === options.sourceKey
      ? reported.state
      : undefined;
  const { sourceKey } = options;

  const onPageChange = useCallback(
    (next: PdfPageState) => setReported({ sourceKey, state: next }),
    [sourceKey],
  );
  // Only the one-page steps slide; a jump (Go to page, a thumbnail) is instant.
  const requestPage = (page: number, animate: boolean) => {
    setRequest((current) => ({
      animate,
      page,
      token: (current?.token ?? 0) + 1,
    }));
  };
  const goTo = (page: number) => requestPage(page, false);

  return {
    controls: buildPageControls(state, options.layout),
    /** Requests a move to a page (0-based). */
    goTo,
    onPageChange,
    /** Where the PDF is now; undefined until it reports a page. */
    state,
    /** The page last reported for this source (0-based), for a surface that starts again. */
    page: state?.page,
    next: () => state && requestPage(stepPage(state, 1, options.layout), true),
    previous: () =>
      state && requestPage(stepPage(state, -1, options.layout), true),
    request,
  };
};
