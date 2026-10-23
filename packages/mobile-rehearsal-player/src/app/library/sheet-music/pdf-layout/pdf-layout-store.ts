import { useSyncExternalStore } from 'react';
import { DEFAULT_PDF_LAYOUT, type PdfLayout } from '@org/audio-library-models';

import { persistPdfLayout, restorePdfLayout } from './pdf-layout-storage';

// One device-wide copy shared by every viewer, so a change shows at once
// (same pattern as the My parts preferences).
let current: PdfLayout = DEFAULT_PDF_LAYOUT;
let hasRestored = false;
let hasChangedBeforeRestore = false;
const listeners = new Set<() => void>();

const publish = (next: PdfLayout) => {
  current = next;
  listeners.forEach((listener) => {
    listener();
  });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  if (!hasRestored) {
    hasRestored = true;
    void restorePdfLayout().then((restored) => {
      // A change made while the read was pending must not be overwritten by it.
      if (!hasChangedBeforeRestore) {
        publish(restored);
      }
    });
  }

  return () => {
    listeners.delete(listener);
  };
};

export const setDevicePdfLayout = (layout: PdfLayout) => {
  hasChangedBeforeRestore = true;
  publish(layout);
  void persistPdfLayout(layout);
};

export const usePdfLayout = (): PdfLayout => {
  return useSyncExternalStore(subscribe, () => current);
};
