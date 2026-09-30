import {
  WAVEFORM_PEAKS_FORMAT_VERSION,
  type WaveformPeaks,
} from '@org/audio-library-models';

import type { WaveformPeakStore } from './peak-store-types';

/** Peaks fall out of use rather than being rewritten on every read. */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export const UNVERSIONED_SOURCE = 'unversioned';

/** Drive's `modifiedTime` is the content version until a revision id is added. */
export const resolveWaveformSourceVersion = (modifiedTime?: string) => {
  return modifiedTime ?? UNVERSIONED_SOURCE;
};

type WaveformPeakCacheOptions = {
  budgetBytes: number;
  now?: () => number;
  store: WaveformPeakStore;
};

/**
 * A versioned, size-capped cache of waveform peaks keyed by Drive file. A
 * read whose version differs from what was analyzed drops the stale entry,
 * and a write evicts the least recently used entries past the budget.
 */
export const createWaveformPeakCache = ({
  budgetBytes,
  now = Date.now,
  store,
}: WaveformPeakCacheOptions) => {
  const evictOverBudget = async (protectedKey: string) => {
    const entries = await store.list();
    let totalBytes = entries.reduce((total, entry) => {
      return total + entry.sizeBytes;
    }, 0);
    const oldestFirst = entries
      .filter((entry) => entry.key !== protectedKey)
      .sort((left, right) => left.touchedAt - right.touchedAt);

    for (const entry of oldestFirst) {
      if (totalBytes <= budgetBytes) {
        return;
      }

      await store.remove(entry.key);
      totalBytes -= entry.sizeBytes;
    }
  };

  return {
    async read(
      key: string,
      sourceVersion: string,
    ): Promise<WaveformPeaks | null> {
      const record = await store.get(key);

      if (!record) {
        return null;
      }

      if (
        record.sourceVersion !== sourceVersion ||
        record.peaks.formatVersion !== WAVEFORM_PEAKS_FORMAT_VERSION
      ) {
        await store.remove(key);
        return null;
      }

      if (now() - record.touchedAt > TOUCH_INTERVAL_MS) {
        await store.put({ ...record, touchedAt: now() });
      }

      return record.peaks;
    },
    async write(key: string, sourceVersion: string, peaks: WaveformPeaks) {
      await store.put({ key, peaks, sourceVersion, touchedAt: now() });
      await evictOverBudget(key);
    },
  };
};

export type WaveformPeakCache = ReturnType<typeof createWaveformPeakCache>;
