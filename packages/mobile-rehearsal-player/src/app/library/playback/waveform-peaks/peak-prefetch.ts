import type { WaveformPeaks } from '@org/audio-library-models';

import type { WaveformPeakRegistry } from './peak-registry';

type PeakPrefetchDependencies = {
  /** Fetches the file's bytes without touching the player; null if it cannot. */
  download: (request: PeakPrefetchRequest) => Promise<Blob | null>;
  extract: (audio: Blob) => Promise<WaveformPeaks | null>;
  registry: Pick<
    WaveformPeakRegistry,
    'getSnapshot' | 'ingest' | 'request' | 'whenLoaded'
  >;
};

export type PeakPrefetchRequest = {
  headers: Record<string, string>;
  url: string;
};

/**
 * Analyzes a file in the background before it is played, so the loop editor
 * has a waveform on open. Nothing is fetched when peaks are cached or an
 * analysis of the file is already running, and it never touches the player,
 * its progress, or its downloads.
 */
export const createWaveformPeakPrefetcher = ({
  download,
  extract,
  registry,
}: PeakPrefetchDependencies) => {
  const inFlight = new Set<string>();

  return async (options: {
    key: string;
    request: PeakPrefetchRequest;
    version: string;
  }): Promise<void> => {
    const { key, request, version } = options;

    registry.request(key, version);
    await registry.whenLoaded(key);

    if (registry.getSnapshot(key) || inFlight.has(key)) {
      return;
    }

    inFlight.add(key);

    try {
      await registry.ingest(key, async () => {
        const audio = await download(request);

        return audio ? extract(audio) : null;
      });
    } finally {
      inFlight.delete(key);
    }
  };
};
