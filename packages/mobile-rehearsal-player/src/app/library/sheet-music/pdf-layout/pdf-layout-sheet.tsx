import type { PdfLayout } from '@org/audio-library-models';
import { useState } from 'react';

import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import { PdfLayoutOptions } from './pdf-layout-options';
import {
  PDF_LAYOUT_SHEET_EYEBROW,
  PDF_LAYOUT_SHEET_TITLE,
  buildPdfLayoutSheetModel,
} from './pdf-layout-sheet-model';

type PdfLayoutSheetProps = {
  /** The device layout. */
  deviceLayout: PdfLayout;
  /** Saves a choice; says whether it went to the device or to the file. */
  onChoose: (
    layout: PdfLayout,
    isOnlyForThisFile: boolean,
  ) => 'device' | 'file';
  onClose: () => void;
  onUseDeviceLayout: () => void;
  /** The open file's own layout, if it has one. */
  ownLayout: PdfLayout | undefined;
};

/**
 * `Layout`: how the open PDF's pages are laid out. A choice is saved as the
 * device layout unless `Only for this file` is on. The switch starts off each
 * time the sheet opens, so a one-off choice never becomes sticky by accident.
 */
export const PdfLayoutSheet = ({
  deviceLayout,
  onChoose,
  onClose,
  onUseDeviceLayout,
  ownLayout,
}: PdfLayoutSheetProps) => {
  const [isOnlyForThisFile, setIsOnlyForThisFile] = useState(false);
  const [changedDeviceTo, setChangedDeviceTo] = useState<PdfLayout>();
  const model = buildPdfLayoutSheetModel({
    changedDeviceTo,
    deviceLayout,
    ownLayout,
  });

  return (
    <BottomSheetSurface
      eyebrow={PDF_LAYOUT_SHEET_EYEBROW}
      footer={
        <MenuGroup>
          <MenuRow label="Done" onPress={onClose} tone="cancel" />
        </MenuGroup>
      }
      isVisible={true}
      onClose={onClose}
      scrollable
      title={PDF_LAYOUT_SHEET_TITLE}
    >
      <PdfLayoutOptions
        isOnlyForThisFile={isOnlyForThisFile}
        model={model}
        onSelect={(layout) => {
          const route = onChoose(layout, isOnlyForThisFile);

          setChangedDeviceTo(route === 'device' ? layout : undefined);
        }}
        onToggleOnlyForThisFile={setIsOnlyForThisFile}
        onUseDeviceLayout={() => {
          setChangedDeviceTo(undefined);
          onUseDeviceLayout();
        }}
      />
    </BottomSheetSurface>
  );
};
