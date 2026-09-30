import type { WaveformPeaks } from '@org/audio-library-models';

import { UNVERSIONED_SOURCE, type WaveformPeakCache } from './peak-cache';

type PeakEntry = {
  /** Resolves once the persisted cache has been consulted for this version. */
  loaded: Promise<void>;
  peaks: WaveformPeaks | null;
  version: string;
};

/**
 * The in-memory view of every analyzed file the UI has asked about. Views
 * subscribe per file; the extraction service feeds it, and both read and
 * write the persisted cache through it.
 */
export const createWaveformPeakRegistry = (cache: WaveformPeakCache) => {
  const entries = new Map<string, PeakEntry>();
  const inFlightExtractions = new Map<string, Promise<void>>();
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const load = (key: string, version: string) => {
    const entry: PeakEntry = {
      loaded: Promise.resolve(),
      peaks: null,
      version,
    };

    entry.loaded = cache
      .read(key, version)
      .then((peaks) => {
        // A newer version may have replaced this entry while the read ran.
        if (entries.get(key) === entry && peaks) {
          entry.peaks = peaks;
          notify();
        }
      })
      .catch(() => undefined);
    entries.set(key, entry);

    return entry;
  };

  return {
    getSnapshot(key: string): WaveformPeaks | null {
      return entries.get(key)?.peaks ?? null;
    },
    /**
     * Records that something is showing `key` at `version`, loading any
     * persisted peaks. A changed version discards what was held.
     */
    request(key: string, version: string) {
      const entry = entries.get(key);

      if (entry && entry.version === version) {
        return;
      }

      const hadPeaks = entry?.peaks != null;

      load(key, version);

      if (hadPeaks) {
        notify();
      }
    },
    /**
     * Analyzes `key` when nothing is held for its registered version, and
     * persists the result. Concurrent calls for one file share one analysis.
     */
    async ingest(
      key: string,
      extract: () => Promise<WaveformPeaks | null>,
    ): Promise<void> {
      const running = inFlightExtractions.get(key);

      if (running) {
        return running;
      }

      const task = (async () => {
        const entry = entries.get(key) ?? load(key, UNVERSIONED_SOURCE);

        await entry.loaded;

        if (entry.peaks) {
          return;
        }

        const peaks = await extract();

        if (!peaks || entries.get(key) !== entry) {
          return;
        }

        entry.peaks = peaks;
        notify();
        await cache.write(key, entry.version, peaks);
      })()
        .catch(() => undefined)
        .finally(() => {
          inFlightExtractions.delete(key);
        });

      inFlightExtractions.set(key, task);

      return task;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export type WaveformPeakRegistry = ReturnType<
  typeof createWaveformPeakRegistry
>;
