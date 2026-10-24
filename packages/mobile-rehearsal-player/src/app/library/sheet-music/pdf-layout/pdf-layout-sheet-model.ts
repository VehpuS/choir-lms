import type { PdfLayout } from '@org/audio-library-models';

import type { AppIconName } from '../../../components/app-icon/model';

export const PDF_LAYOUT_SHEET_EYEBROW = 'Sheet music';
export const PDF_LAYOUT_SHEET_TITLE = 'Layout';
export const ONLY_FOR_THIS_FILE_LABEL = 'Only for this file';
export const OWN_LAYOUT_NOTE = 'This file uses its own layout';
export const USE_DEVICE_LAYOUT_LABEL = 'Use the device layout';

const LAYOUT_ORDER: readonly PdfLayout[] = ['scroll', 'pages', 'strip'];

export const PDF_LAYOUT_LABELS: Record<PdfLayout, string> = {
  pages: 'Pages',
  scroll: 'Scroll',
  strip: 'Strip',
};

/** Which glyph stands for each layout, on the toolbar button and in the sheet. */
export const PDF_LAYOUT_ICONS: Record<PdfLayout, AppIconName> = {
  pages: 'pdf-layout-pages',
  scroll: 'pdf-layout-scroll',
  strip: 'pdf-layout-strip',
};

export type PdfLayoutOption = {
  icon: AppIconName;
  isSelected: boolean;
  label: string;
  layout: PdfLayout;
};

export type PdfLayoutSheetModel = {
  /** Removes the file's own layout; offered only while it has one. */
  canUseDeviceLayout: boolean;
  /** Says the device layout changed without changing what the file shows. */
  deviceNote: string | undefined;
  options: PdfLayoutOption[];
  ownLayoutNote: string | undefined;
};

/**
 * What the layout sheet shows. The marked choice is the layout the file is in
 * now (its own, else the device's), so the sheet never contradicts the screen.
 * `changedDeviceTo` is the device layout the user just chose while the file
 * kept its own; it is explained rather than shown as the marked choice.
 */
export const buildPdfLayoutSheetModel = (input: {
  changedDeviceTo?: PdfLayout;
  deviceLayout: PdfLayout;
  ownLayout: PdfLayout | undefined;
}): PdfLayoutSheetModel => {
  const shown = input.ownLayout ?? input.deviceLayout;
  const hasOwnLayout = input.ownLayout !== undefined;

  return {
    canUseDeviceLayout: hasOwnLayout,
    deviceNote:
      hasOwnLayout && input.changedDeviceTo
        ? `Device layout changed to ${PDF_LAYOUT_LABELS[input.changedDeviceTo]}. This file keeps its own layout.`
        : undefined,
    options: LAYOUT_ORDER.map((layout) => ({
      icon: PDF_LAYOUT_ICONS[layout],
      isSelected: layout === shown,
      label: PDF_LAYOUT_LABELS[layout],
      layout,
    })),
    ownLayoutNote: hasOwnLayout ? OWN_LAYOUT_NOTE : undefined,
  };
};

/** Where a choice is saved: on the open file, or as the device layout. */
export const routePdfLayoutChoice = (
  isOnlyForThisFile: boolean,
): 'device' | 'file' => (isOnlyForThisFile ? 'file' : 'device');
