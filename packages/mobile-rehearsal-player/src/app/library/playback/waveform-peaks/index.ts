import { subscribeToSavedTrackDownloads } from '../utils/saved-track-download-events';
import { createWaveformPeakCache } from './peak-cache';
import { startWaveformPeakExtraction } from './peak-extraction-service';
import { extractWaveformPeaks } from './peak-extractor';
import { createWaveformPeakRegistry } from './peak-registry';
import { WAVEFORM_PEAK_BUDGET_BYTES, waveformPeakStore } from './peak-store';

export const waveformPeakRegistry = createWaveformPeakRegistry(
  createWaveformPeakCache({
    budgetBytes: WAVEFORM_PEAK_BUDGET_BYTES,
    store: waveformPeakStore,
  }),
);

let stopExtraction: (() => void) | null = null;

/** Starts analyzing downloads once; later calls are no-ops. */
export const ensureWaveformPeakExtraction = () => {
  stopExtraction ??= startWaveformPeakExtraction({
    extract: extractWaveformPeaks,
    registry: waveformPeakRegistry,
    subscribe: subscribeToSavedTrackDownloads,
  });
};
