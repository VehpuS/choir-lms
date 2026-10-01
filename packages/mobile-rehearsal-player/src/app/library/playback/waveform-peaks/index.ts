import type { PlayableItem } from '@org/audio-library-models';

import { subscribeToSavedTrackDownloads } from '../utils/saved-track-download-events';
import { createSavedTrackPlaybackRequest } from '../utils/saved-track-playback-view-model';
import {
  createWaveformPeakCache,
  resolveWaveformSourceVersion,
} from './peak-cache';
import { startWaveformPeakExtraction } from './peak-extraction-service';
import { extractWaveformPeaks } from './peak-extractor';
import { createWaveformPeakPrefetcher } from './peak-prefetch';
import { downloadAudioForPeaks } from './peak-prefetch-download';
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

const prefetchPeaks = createWaveformPeakPrefetcher({
  download: downloadAudioForPeaks,
  extract: extractWaveformPeaks,
  registry: waveformPeakRegistry,
});

/**
 * Starts analyzing an item's file in the background so its waveform is ready
 * before playback. Fire and forget: it never throws and never blocks.
 */
export const prefetchWaveformPeaks = (
  item: PlayableItem,
  accessToken: string,
) => {
  const { track } = createSavedTrackPlaybackRequest({
    accessToken,
    playableItem: item,
  });

  void prefetchPeaks({
    key: item.source.driveFileId,
    request: { headers: track.headers, url: track.url },
    version: resolveWaveformSourceVersion(item.source.modifiedTime),
  }).catch(() => undefined);
};
