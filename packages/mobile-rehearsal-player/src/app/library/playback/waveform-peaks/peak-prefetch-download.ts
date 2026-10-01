import type { PeakPrefetchRequest } from './peak-prefetch';

/**
 * Native has no extractor (see `peak-extractor.ts`), so downloading a whole
 * file in the background would only spend data and battery.
 */
export const downloadAudioForPeaks: (
  request: PeakPrefetchRequest,
) => Promise<Blob | null> = async () => null;
