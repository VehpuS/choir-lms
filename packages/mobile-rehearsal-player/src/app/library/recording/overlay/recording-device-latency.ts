import AsyncStorage from '@react-native-async-storage/async-storage';
import { clamp, isPlainObject, round } from 'es-toolkit';

import { MAX_NUDGE_MS } from '@org/audio-library-models';
import { MAX_DEVICE_LATENCY_MS } from './recording-sync-model';

type LatencyStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

export const DEVICE_LATENCY_STORAGE_KEY = 'choirlms.recording.deviceLatency';

/** Compensation in milliseconds per output device key. */
export type DeviceLatencies = Record<string, number>;

/**
 * Parses what was stored where it enters the app: anything that is not a
 * finite number is dropped, and the rest is clamped to a usable range.
 */
export const parseDeviceLatencies = (raw: string | null): DeviceLatencies => {
  if (!raw) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isPlainObject(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(
          (entry): entry is [string, number] =>
            typeof entry[1] === 'number' && Number.isFinite(entry[1]),
        )
        .map(([key, value]) => [
          key,
          round(clamp(value, -MAX_NUDGE_MS, MAX_DEVICE_LATENCY_MS)),
        ]),
    );
  } catch {
    return {};
  }
};

/** The compensation saved for this output, or `null` when none was. */
export const getDeviceLatency = async (
  deviceKey: string,
  storage: LatencyStorage = AsyncStorage,
): Promise<number | null> => {
  try {
    const all = parseDeviceLatencies(
      await storage.getItem(DEVICE_LATENCY_STORAGE_KEY),
    );

    return all[deviceKey] ?? null;
  } catch {
    return null;
  }
};

/**
 * Keeps the compensation for an output. Only new recordings read it; existing
 * ones keep what they were recorded with (design Decision 3).
 */
export const saveDeviceLatency = async (
  deviceKey: string,
  latencyMs: number,
  storage: LatencyStorage = AsyncStorage,
): Promise<void> => {
  try {
    const all = parseDeviceLatencies(
      await storage.getItem(DEVICE_LATENCY_STORAGE_KEY),
    );

    await storage.setItem(
      DEVICE_LATENCY_STORAGE_KEY,
      JSON.stringify({ ...all, [deviceKey]: latencyMs }),
    );
  } catch {
    // The nudge is still saved with the recording; only the default is lost.
  }
};
