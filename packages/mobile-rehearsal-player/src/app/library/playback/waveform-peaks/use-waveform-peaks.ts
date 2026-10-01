import type { WaveformPeaks } from '@org/audio-library-models';
import { useEffect, useSyncExternalStore } from 'react';

import { waveformPeakRegistry } from './index';
import { resolveWaveformSourceVersion } from './peak-cache';

const NO_PEAKS = () => null;

/**
 * The peaks for a file once they exist (cached from an earlier play, or just
 * analyzed from a download), else null while the UI shows its placeholder.
 */
export const useWaveformPeaks = (source: {
  driveFileId: string;
  modifiedTime?: string;
}): WaveformPeaks | null => {
  const key = source.driveFileId;
  const version = resolveWaveformSourceVersion(source.modifiedTime);

  useEffect(() => {
    waveformPeakRegistry.request(key, version);
  }, [key, version]);

  return useSyncExternalStore(
    waveformPeakRegistry.subscribe,
    () => waveformPeakRegistry.getSnapshot(key),
    NO_PEAKS,
  );
};

/** Whether the file's peaks are still being looked up or analyzed. */
export const useWaveformPeaksPending = (source: {
  driveFileId: string;
}): boolean => {
  return (
    useSyncExternalStore(
      waveformPeakRegistry.subscribe,
      () => waveformPeakRegistry.getStatus(source.driveFileId),
      () => 'none' as const,
    ) === 'pending'
  );
};
