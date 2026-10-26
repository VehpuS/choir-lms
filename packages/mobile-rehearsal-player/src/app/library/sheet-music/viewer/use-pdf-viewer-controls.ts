import type { PdfLayout, SheetMusicSource } from '@org/audio-library-models';
import { useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { appTheme } from '../../../utils/theme';

import { useGoToPageControl } from '../go-to-page/use-go-to-page-control';
import { buildPageSteps } from '../pdf-layout/page-steps';
import { usePdfLayoutControl } from '../pdf-layout/use-pdf-layout-control';
import { usePdfPageControl } from '../pdf-layout/use-pdf-page-control';
import { isSpreadAvailable } from '../renderers/pdf-spread-availability';

/**
 * The PDF viewer's controls: the layout button and sheet, the page indicator
 * and its step buttons, and `Go to page`. The layout shown follows the width of
 * the page area (`Spread` needs two readable pages). `after` wraps a toolbar action so the
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
  const { width: windowWidth } = useWindowDimensions();
  // The page area's own width, once the surface reports it; until then the
  // window less its margins, so a wide window does not flash Pages first.
  const [viewerWidth, setViewerWidth] = useState<number>();
  const pdfLayout = usePdfLayoutControl({
    isPdf,
    isSpreadAvailable: isSpreadAvailable({
      width: viewerWidth ?? windowWidth - appTheme.space.screenInset * 2,
    }),
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

  return {
    goToPage,
    /** The page area's width in pixels; `Spread` is offered only when it is wide enough. */
    onViewerWidth: setViewerWidth,
    pageSteps,
    pdfLayout,
    pdfPages,
  };
};
