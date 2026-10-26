import type { PdfLayout, SheetMusicSource } from '@org/audio-library-models';

import { useGoToPageControl } from '../go-to-page/use-go-to-page-control';
import { buildPageSteps } from '../pdf-layout/page-steps';
import { usePdfLayoutControl } from '../pdf-layout/use-pdf-layout-control';
import { usePdfPageControl } from '../pdf-layout/use-pdf-page-control';

/**
 * The PDF viewer's controls: the layout button and sheet, the page indicator
 * and its step buttons, and `Go to page`. `after` wraps a toolbar action so the
 * page area takes keyboard focus back once it ran.
 */
export const usePdfViewerControls = (options: {
  after: (action: () => void) => () => void;
  isPdf: boolean;
  onChangePdfLayout: (sourceId: string, layout: PdfLayout | null) => void;
  returnFocus: () => void;
  source: SheetMusicSource | undefined;
}) => {
  const { after, isPdf, onChangePdfLayout, returnFocus, source } = options;
  const pdfLayout = usePdfLayoutControl({
    isPdf,
    isSpreadAvailable: false,
    onClosed: returnFocus,
    onSaveSourceLayout: onChangePdfLayout,
    source,
  });
  const pdfPages = usePdfPageControl({
    layout: pdfLayout.layout,
    sourceKey: source ? `${source.id}:${source.format}` : undefined,
  });
  const goToPage = useGoToPageControl({
    layout: pdfLayout.layout,
    onClosed: returnFocus,
    onGo: pdfPages.goTo,
    state: pdfPages.state,
  });
  const pageSteps = buildPageSteps(pdfPages.controls, {
    next: after(pdfPages.next),
    previous: after(pdfPages.previous),
  });

  return { goToPage, pageSteps, pdfLayout, pdfPages };
};
