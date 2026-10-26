import type { PdfLayout } from '@org/audio-library-models';

import type { PdfRendering } from '../renderers/sheet-music-renderer';

/**
 * Puts a drawn PDF in the chosen layout. A changed layout starts fitted (zoom
 * 1), so the viewer's zoom is told to follow. Nothing happens when the PDF is
 * already in the layout, so a fresh surface keeps the zoom it opened with.
 */
export const syncPdfLayout = (
  pdf:
    | Pick<PdfRendering, 'currentLayout' | 'currentZoom' | 'setLayout'>
    | undefined,
  layout: PdfLayout,
  onZoomChange: (zoom: number) => void,
): void => {
  if (!pdf || pdf.currentLayout() === layout) {
    return;
  }

  pdf.setLayout(layout);
  onZoomChange(pdf.currentZoom());
};
