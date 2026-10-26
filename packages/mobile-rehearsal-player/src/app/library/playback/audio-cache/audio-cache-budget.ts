import AsyncStorage from '@react-native-async-storage/async-storage';

type BudgetStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

const BYTES_PER_MEGABYTE = 1024 * 1024;
const MEGABYTES_PER_GIGABYTE = 1024;

/** A byte count, or a getter for one that the user can change at runtime. */
export type AudioCacheBudget = number | (() => number);

export const resolveAudioCacheBudget = (budget: AudioCacheBudget): number => {
  return typeof budget === 'function' ? budget() : budget;
};

/** The sizes the user picks from for the automatic cache (design, 2026-10-27). */
export const AUDIO_CACHE_BUDGET_PRESETS_BYTES: readonly number[] = [
  100 * BYTES_PER_MEGABYTE,
  250 * BYTES_PER_MEGABYTE,
  500 * BYTES_PER_MEGABYTE,
  MEGABYTES_PER_GIGABYTE * BYTES_PER_MEGABYTE,
  2 * MEGABYTES_PER_GIGABYTE * BYTES_PER_MEGABYTE,
];

/** Web default for both the in-memory and persisted audio caches. */
export const DEFAULT_AUDIO_CACHE_BUDGET_BYTES =
  AUDIO_CACHE_BUDGET_PRESETS_BYTES[1];

export const AUDIO_CACHE_BUDGET_KEY = 'choirlms.offline.cacheBytes';

/** Only a known preset is accepted, so a stale or edited value cannot leak in. */
export const parseAudioCacheBudget = (value: unknown): number => {
  const parsed = typeof value === 'string' ? Number(value) : NaN;

  return AUDIO_CACHE_BUDGET_PRESETS_BYTES.includes(parsed)
    ? parsed
    : DEFAULT_AUDIO_CACHE_BUDGET_BYTES;
};

export type AudioCacheBudgetStore = {
  get: () => number;
  /** Loads the saved size; a size chosen while it was pending wins. */
  restore: () => Promise<void>;
  /** Changes the size, tells subscribers, and remembers it on this device. */
  set: (bytes: number) => Promise<void>;
  subscribe: (listener: () => void) => () => void;
};

export const createAudioCacheBudgetStore = (
  storage: BudgetStorage,
): AudioCacheBudgetStore => {
  let current = DEFAULT_AUDIO_CACHE_BUDGET_BYTES;
  let hasChosen = false;
  const listeners = new Set<() => void>();
  const update = (bytes: number) => {
    if (bytes === current) {
      return;
    }

    current = bytes;
    listeners.forEach((listener) => {
      listener();
    });
  };

  return {
    get: () => current,
    async restore() {
      try {
        const restored = parseAudioCacheBudget(
          await storage.getItem(AUDIO_CACHE_BUDGET_KEY),
        );

        if (!hasChosen) {
          update(restored);
        }
      } catch {
        // The default applies when nothing can be read.
      }
    },
    async set(bytes) {
      hasChosen = true;
      update(parseAudioCacheBudget(String(bytes)));

      try {
        await storage.setItem(AUDIO_CACHE_BUDGET_KEY, String(current));
      } catch {
        // The choice only lasts for this session; nothing else depends on it.
      }
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

/** One device-level size read by both audio caches and the settings page. */
export const audioCacheBudgetStore = createAudioCacheBudgetStore(AsyncStorage);
