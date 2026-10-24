import {
  resolvePdfLayout,
  type PdfLayout,
  type SheetMusicSource,
} from '@org/audio-library-models';
import { useState } from 'react';

import { routePdfLayoutChoice } from './pdf-layout-sheet-model';
import { setDevicePdfLayout, usePdfLayout } from './pdf-layout-store';

type PdfLayoutChoiceOptions = {
  /** Saves (or, with `null`, clears) the source's own layout. */
  onSaveSourceLayout: (sourceId: string, layout: PdfLayout | null) => void;
  source: SheetMusicSource | undefined;
};

/**
 * The layout a PDF is in (its own, else the device's) and the changes the
 * layout sheet can make. A file's own layout is kept here too, so a change
 * shows at once without waiting for the saved list to refresh.
 */
export const usePdfLayoutChoice = ({
  onSaveSourceLayout,
  source,
}: PdfLayoutChoiceOptions) => {
  const deviceLayout = usePdfLayout();
  const [saved, setSaved] = useState<Record<string, PdfLayout | null>>({});
  const ownLayout =
    source && source.id in saved
      ? (saved[source.id] ?? undefined)
      : source?.pdfLayout;

  const saveOwnLayout = (layout: PdfLayout | null) => {
    if (!source) {
      return;
    }

    setSaved((current) => ({ ...current, [source.id]: layout }));
    onSaveSourceLayout(source.id, layout);
  };

  return {
    deviceLayout,
    layout: resolvePdfLayout({ pdfLayout: ownLayout }, deviceLayout),
    ownLayout,
    /** Says where the choice went, so the sheet can explain a device change. */
    choose(layout: PdfLayout, isOnlyForThisFile: boolean) {
      const route = routePdfLayoutChoice(isOnlyForThisFile);

      if (route === 'file') {
        saveOwnLayout(layout);
      } else {
        setDevicePdfLayout(layout);
      }

      return route;
    },
    useDeviceLayout: () => saveOwnLayout(null),
  };
};
