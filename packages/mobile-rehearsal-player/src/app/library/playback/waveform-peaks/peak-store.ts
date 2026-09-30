import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deserializeWaveformPeaks,
  serializeWaveformPeaks,
} from '@org/audio-library-models';

import type { LocalLibraryStorage } from '../../storage/local-library-storage';
import type {
  WaveformPeakEntry,
  WaveformPeakRecord,
  WaveformPeakStore,
} from './peak-store-types';

const PEAK_KEY_PREFIX = 'choirlms:practice:peaks:';
const PEAK_INDEX_KEY = 'choirlms:practice:peaks-index';

/**
 * Native AsyncStorage holds far less than web IndexedDB (Android caps the
 * whole database near 6 MB), so its share for peaks is small.
 */
export const WAVEFORM_PEAK_BUDGET_BYTES = 3 * 1024 * 1024;

type StoredPeakRecord = {
  peaks: unknown;
  sourceVersion: string;
  touchedAt: number;
};

const parseIndex = (raw: string | null): WaveformPeakEntry[] => {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? (parsed as WaveformPeakEntry[]) : [];
  } catch {
    return [];
  }
};

/**
 * Each record lives under its own key so one write stays small; a separate
 * index lists sizes and recency for the cache's eviction.
 */
export const createAsyncStorageWaveformPeakStore = (
  storage: LocalLibraryStorage = AsyncStorage,
): WaveformPeakStore => {
  const readIndex = async () => {
    return parseIndex(await storage.getItem(PEAK_INDEX_KEY));
  };
  const writeIndex = async (entries: WaveformPeakEntry[]) => {
    await storage.setItem(PEAK_INDEX_KEY, JSON.stringify(entries));
  };

  return {
    async get(key) {
      const raw = await storage.getItem(`${PEAK_KEY_PREFIX}${key}`);

      if (!raw) {
        return null;
      }

      try {
        const stored = JSON.parse(raw) as StoredPeakRecord;
        const peaks = deserializeWaveformPeaks(stored.peaks);

        return peaks
          ? {
              key,
              peaks,
              sourceVersion: stored.sourceVersion,
              touchedAt: stored.touchedAt,
            }
          : null;
      } catch {
        return null;
      }
    },
    list: readIndex,
    async put(record: WaveformPeakRecord) {
      const stored: StoredPeakRecord = {
        peaks: serializeWaveformPeaks(record.peaks),
        sourceVersion: record.sourceVersion,
        touchedAt: record.touchedAt,
      };

      await storage.setItem(
        `${PEAK_KEY_PREFIX}${record.key}`,
        JSON.stringify(stored),
      );

      const others = (await readIndex()).filter((entry) => {
        return entry.key !== record.key;
      });

      await writeIndex([
        ...others,
        {
          key: record.key,
          sizeBytes: record.peaks.buckets.length,
          touchedAt: record.touchedAt,
        },
      ]);
    },
    async remove(key) {
      await storage.removeItem(`${PEAK_KEY_PREFIX}${key}`);
      await writeIndex(
        (await readIndex()).filter((entry) => entry.key !== key),
      );
    },
  };
};

export const waveformPeakStore = createAsyncStorageWaveformPeakStore();
