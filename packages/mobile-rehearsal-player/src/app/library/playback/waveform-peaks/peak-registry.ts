import type { WaveformPeaks } from '@org/audio-library-models';

import { UNVERSIONED_SOURCE, type WaveformPeakCache } from './peak-cache';

/** What the UI can show for a file: nothing yet, working on it, or ready. */
export type WaveformPeakStatus = 'none' | 'pending' | 'ready';

type PeakEntry = {
  /** False until the persisted cache has been consulted. */
  isLoaded: boolean;
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
      isLoaded: false,
      loaded: Promise.resolve(),
      peaks: null,
      version,
    };

    entry.loaded = cache
      .read(key, version)
      .then((peaks) => {
        // A newer version may have replaced this entry while the read ran.
        if (entries.get(key) === entry) {
          entry.peaks = peaks ?? entry.peaks;
          entry.isLoaded = true;
          notify();
        }
      })
      .catch(() => {
        if (entries.get(key) === entry) {
          entry.isLoaded = true;
          notify();
        }
      });
    entries.set(key, entry);

    return entry;
  };

  return {
    getSnapshot(key: string): WaveformPeaks | null {
      return entries.get(key)?.peaks ?? null;
    },
    /**
     * `pending` from the first request until the cache has answered and for
     * as long as an analysis of the file is running, so a view can keep its
     * loading indicator up for exactly as long as work is outstanding.
     */
    getStatus(key: string): WaveformPeakStatus {
      const entry = entries.get(key);

      if (entry?.peaks) {
        return 'ready';
      }

      return entry && (!entry.isLoaded || inFlightExtractions.has(key))
        ? 'pending'
        : 'none';
    },
    /** Resolves once persisted peaks for `key` have been looked up. */
    async whenLoaded(key: string): Promise<void> {
      await entries.get(key)?.loaded;
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
          notify();
        });

      inFlightExtractions.set(key, task);
      notify();

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
