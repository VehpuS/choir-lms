import type { PdfLayout, SheetMusicSource } from '@org/audio-library-models';
import { useState, type ReactNode } from 'react';

import { PdfLayoutSheet } from './pdf-layout-sheet';
import { usePdfLayoutChoice } from './use-pdf-layout-choice';

type PdfLayoutControlOptions = {
  /** Only a PDF has layouts; anything else gets no control. */
  isPdf: boolean;
  onSaveSourceLayout: (sourceId: string, layout: PdfLayout | null) => void;
  source: SheetMusicSource | undefined;
};

/**
 * The PDF layout in effect, the toolbar's `Layout` button, and the sheet it
 * opens. `button` is undefined (and the sheet never shows) off a PDF.
 */
export const usePdfLayoutControl = ({
  isPdf,
  onSaveSourceLayout,
  source,
}: PdfLayoutControlOptions): {
  button: { layout: PdfLayout; onOpen: () => void } | undefined;
  layout: PdfLayout;
  sheet: ReactNode;
} => {
  const choice = usePdfLayoutChoice({ onSaveSourceLayout, source });
  const [isOpen, setIsOpen] = useState(false);

  return {
    button: isPdf
      ? { layout: choice.layout, onOpen: () => setIsOpen(true) }
      : undefined,
    layout: choice.layout,
    sheet:
      isPdf && isOpen ? (
        <PdfLayoutSheet
          deviceLayout={choice.deviceLayout}
          onChoose={choice.choose}
          onClose={() => setIsOpen(false)}
          onUseDeviceLayout={choice.useDeviceLayout}
          ownLayout={choice.ownLayout}
        />
      ) : null,
  };
};
