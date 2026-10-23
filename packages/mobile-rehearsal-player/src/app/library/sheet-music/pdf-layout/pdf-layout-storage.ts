import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_PDF_LAYOUT,
  parsePdfLayout,
  type PdfLayout,
} from '@org/audio-library-models';

type PdfLayoutStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

export const PDF_LAYOUT_KEY = 'choirlms.sheet-music.pdf-layout';

/** Reads the device layout; a missing, unknown, or unreadable value is `scroll`. */
export const restorePdfLayout = async (
  storage: PdfLayoutStorage = AsyncStorage,
): Promise<PdfLayout> => {
  try {
    return (
      parsePdfLayout(await storage.getItem(PDF_LAYOUT_KEY)) ??
      DEFAULT_PDF_LAYOUT
    );
  } catch {
    return DEFAULT_PDF_LAYOUT;
  }
};

export const persistPdfLayout = async (
  layout: PdfLayout,
  storage: PdfLayoutStorage = AsyncStorage,
): Promise<void> => {
  try {
    await storage.setItem(PDF_LAYOUT_KEY, layout);
  } catch {
    // The choice still applies for this session.
  }
};
