import { useEffect, useState } from 'react';

import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import type { PdfThumbnailTask } from '../renderers/sheet-music-renderer';
import { GoToPageHeader } from './go-to-page-header';
import { markedPages, type GoToPageLayout } from './go-to-page-model';
import { ThumbnailGrid } from './thumbnail-grid';
import {
  createThumbnailQueue,
  type ThumbnailCanvas,
  type ThumbnailQueue,
} from './thumbnail-queue';

export const GO_TO_PAGE_TITLE = 'Go to page';

type GoToPageSheetProps = {
  currentPage: number;
  /** Draws a page into a canvas; absent where nothing can draw pages (native). */
  drawThumbnail?: (
    index: number,
    canvas: ThumbnailCanvas,
    cssWidth: number,
  ) => PdfThumbnailTask;
  layout: GoToPageLayout;
  onClose: () => void;
  /** Called with the chosen 0-based page; the caller closes the sheet. */
  onGo: (page: number) => void;
  pageCount: number;
};

/**
 * `Go to page`: a page number field above a grid of page thumbnails. Choosing
 * either calls `onGo`. Thumbnails are drawn one at a time and every one is
 * released when the sheet closes.
 */
export const GoToPageSheet = ({
  currentPage,
  drawThumbnail,
  layout,
  onClose,
  onGo,
  pageCount,
}: GoToPageSheetProps) => {
  const [queue, setQueue] = useState<ThumbnailQueue>();

  useEffect(() => {
    if (!drawThumbnail) {
      return;
    }

    const created = createThumbnailQueue({ draw: drawThumbnail });

    setQueue(created);

    return () => {
      created.release();
      setQueue(undefined);
    };
  }, [drawThumbnail]);

  return (
    <BottomSheetSurface
      footer={
        <MenuGroup>
          <MenuRow label="Done" onPress={onClose} tone="cancel" />
        </MenuGroup>
      }
      isVisible={true}
      onClose={onClose}
      title={GO_TO_PAGE_TITLE}
    >
      <GoToPageHeader
        currentPage={currentPage}
        onGo={onGo}
        pageCount={pageCount}
      />
      <ThumbnailGrid
        currentPage={currentPage}
        marked={markedPages(layout, currentPage, pageCount)}
        onChoose={onGo}
        pageCount={pageCount}
        queue={queue}
      />
    </BottomSheetSurface>
  );
};
