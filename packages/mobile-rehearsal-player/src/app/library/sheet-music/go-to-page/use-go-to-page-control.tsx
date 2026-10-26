import type { PdfLayout } from '@org/audio-library-models';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import type { PdfPageState } from '../pdf-layout/pdf-page-controls-model';
import type { PdfRendering } from '../renderers/sheet-music-renderer';
import { GoToPageSheet } from './go-to-page-sheet';

type GoToPageControlOptions = {
  layout: PdfLayout;
  /** Moves the viewer to a page (0-based). */
  onGo: (page: number) => void;
  /** Where the PDF is; the sheet cannot open before it reports a page. */
  state: PdfPageState | undefined;
};

/**
 * The `Go to page` sheet for the open PDF. `open` is undefined until the PDF
 * has reported its pages. `onThumbnailDrawer` takes the open PDF's page
 * drawing from the viewer's surface, so thumbnails use the document the
 * viewer already holds.
 */
export const useGoToPageControl = ({
  layout,
  onGo,
  state,
}: GoToPageControlOptions): {
  onThumbnailDrawer: (draw: PdfRendering['drawThumbnail'] | undefined) => void;
  open: (() => void) | undefined;
  sheet: ReactNode;
} => {
  const [isOpen, setIsOpen] = useState(false);
  const [draw, setDraw] = useState<PdfRendering['drawThumbnail']>();
  const hasPages = state !== undefined;

  // The sheet belongs to one document; it closes when the document goes.
  useEffect(() => {
    if (!hasPages) {
      setIsOpen(false);
    }
  }, [hasPages]);

  // `draw` is a function, so it is wrapped to keep it from being read as an updater.
  const onThumbnailDrawer = useCallback(
    (next: PdfRendering['drawThumbnail'] | undefined) => setDraw(() => next),
    [],
  );

  return {
    onThumbnailDrawer,
    open: hasPages ? () => setIsOpen(true) : undefined,
    sheet:
      isOpen && state ? (
        <GoToPageSheet
          currentPage={state.page}
          drawThumbnail={draw}
          lastPageInView={state.lastPage}
          layout={layout}
          onClose={() => setIsOpen(false)}
          onGo={(page) => {
            setIsOpen(false);
            onGo(page);
          }}
          pageCount={state.pageCount}
        />
      ) : null,
  };
};
