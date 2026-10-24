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
  const goTo = (page: number) => {
    setRequest((current) => ({ page, token: (current?.token ?? 0) + 1 }));
  };

  return {
    controls: buildPageControls(state, options.layout),
    onPageChange,
    next: () => state && goTo(stepPage(state, 1)),
    previous: () => state && goTo(stepPage(state, -1)),
    request,
  };
};
