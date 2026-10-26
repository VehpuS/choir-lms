import type { PdfLayout, SheetMusicSource } from '@org/audio-library-models';
import { useState, type ReactNode } from 'react';

import { resolveEffectivePdfLayout } from '../renderers/pdf-spread-availability';
import { PdfLayoutSheet } from './pdf-layout-sheet';
import { usePdfLayoutChoice } from './use-pdf-layout-choice';

type PdfLayoutControlOptions = {
  /** Only a PDF has layouts; anything else gets no control. */
  isPdf: boolean;
  /** Whether the viewer is wide enough to offer `Spread`. */
  isSpreadAvailable: boolean;
  /** Called when the sheet closes. */
  onClosed?: () => void;
  onSaveSourceLayout: (sourceId: string, layout: PdfLayout | null) => void;
  source: SheetMusicSource | undefined;
};

/**
 * The PDF layout in effect (a stored `spread` is `pages` while the viewer is
 * too narrow for it), the toolbar's `Layout` button, and the sheet it
 * opens. `button` is undefined (and the sheet never shows) off a PDF.
 */
export const usePdfLayoutControl = ({
  isPdf,
  isSpreadAvailable,
  onClosed,
  onSaveSourceLayout,
  source,
}: PdfLayoutControlOptions): {
  button: { layout: PdfLayout; onOpen: () => void } | undefined;
  layout: PdfLayout;
  sheet: ReactNode;
} => {
  const choice = usePdfLayoutChoice({ onSaveSourceLayout, source });
  // A stored spread shows as pages while the viewer is too narrow for it.
  const layout = resolveEffectivePdfLayout(choice.layout, isSpreadAvailable);
  const [isOpen, setIsOpen] = useState(false);

  return {
    button: isPdf ? { layout, onOpen: () => setIsOpen(true) } : undefined,
    layout,
    sheet:
      isPdf && isOpen ? (
        <PdfLayoutSheet
          deviceLayout={choice.deviceLayout}
          isSpreadAvailable={isSpreadAvailable}
          onChoose={choice.choose}
          onClose={() => {
            setIsOpen(false);
            onClosed?.();
          }}
          onUseDeviceLayout={choice.useDeviceLayout}
          ownLayout={choice.ownLayout}
        />
      ) : null,
  };
};
