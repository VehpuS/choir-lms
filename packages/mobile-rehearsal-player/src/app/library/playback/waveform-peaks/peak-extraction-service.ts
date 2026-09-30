import type { WaveformPeaks } from '@org/audio-library-models';

import type { SavedTrackDownloadedEvent } from '../utils/saved-track-download-events';
import type { WaveformPeakRegistry } from './peak-registry';

type PeakExtractionServiceDependencies = {
  extract: (audio: Blob) => Promise<WaveformPeaks | null>;
  registry: Pick<WaveformPeakRegistry, 'ingest'>;
  subscribe: (
    listener: (event: SavedTrackDownloadedEvent) => void,
  ) => () => void;
};

/**
 * Analyzes each file the player downloads (design Decision 4, option 1), so
 * the waveform costs no second fetch. Returns the unsubscribe function.
 */
export const startWaveformPeakExtraction = ({
  extract,
  registry,
  subscribe,
}: PeakExtractionServiceDependencies) => {
  return subscribe((event) => {
    if (!event.driveFileId) {
      return;
    }

    void registry.ingest(event.driveFileId, () => extract(event.blob));
  });
};
