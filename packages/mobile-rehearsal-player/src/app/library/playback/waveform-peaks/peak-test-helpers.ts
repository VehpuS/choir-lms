import {
  WAVEFORM_PEAKS_FORMAT_VERSION,
  type WaveformPeaks,
} from '@org/audio-library-models';

import type { WaveformPeakRecord, WaveformPeakStore } from './peak-store-types';

export const createTestPeaks = (
  buckets: number[] = [10, 200, 30],
): WaveformPeaks => {
  return {
    buckets: Uint8Array.from(buckets),
    durationMs: 3000,
    formatVersion: WAVEFORM_PEAKS_FORMAT_VERSION,
  };
};

/** A real in-memory store: the cache logic is what the tests exercise. */
export const createMemoryPeakStore = () => {
  const records = new Map<string, WaveformPeakRecord>();
  const store: WaveformPeakStore = {
    async get(key) {
      return records.get(key) ?? null;
    },
    async list() {
      return [...records.values()].map((record) => ({
        key: record.key,
        sizeBytes: record.peaks.buckets.length,
        touchedAt: record.touchedAt,
      }));
    },
    async put(record) {
      records.set(record.key, record);
    },
    async remove(key) {
      records.delete(key);
    },
  };

  return { records, store };
};
