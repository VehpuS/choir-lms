import type { MarkerListFilter } from '@org/audio-library-models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

type MarkersFilterStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

export const MARKERS_FILTER_KEY = 'choirlms.markers.filter';
export const DEFAULT_MARKERS_FILTER: MarkerListFilter = 'all';

/** Unknown or missing stored values fall back to showing everything. */
export const parseMarkersFilter = (value: unknown): MarkerListFilter => {
  return value === 'mine' ? 'mine' : DEFAULT_MARKERS_FILTER;
};

export const restoreMarkersFilter = async (
  storage: MarkersFilterStorage = AsyncStorage,
): Promise<MarkerListFilter> => {
  try {
    return parseMarkersFilter(await storage.getItem(MARKERS_FILTER_KEY));
  } catch {
    return DEFAULT_MARKERS_FILTER;
  }
};

export const persistMarkersFilter = async (
  filter: MarkerListFilter,
  storage: MarkersFilterStorage = AsyncStorage,
): Promise<void> => {
  try {
    await storage.setItem(MARKERS_FILTER_KEY, filter);
  } catch {
    // The choice only lasts for this session; nothing else depends on it.
  }
};

// The sheet, the picker, and the waveform flags read one device-level value,
// so it lives at module scope and every consumer subscribes to it.
let currentFilter: MarkerListFilter = DEFAULT_MARKERS_FILTER;
let hasRestored = false;
const listeners = new Set<() => void>();

const setCurrentFilter = (filter: MarkerListFilter) => {
  if (filter === currentFilter) {
    return;
  }

  currentFilter = filter;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => currentFilter;

export const setMarkersFilter = (filter: MarkerListFilter) => {
  hasRestored = true;
  setCurrentFilter(filter);
  void persistMarkersFilter(filter);
};

export const useMarkersFilter = () => {
  const filter = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (hasRestored) {
      return;
    }

    hasRestored = true;
    void restoreMarkersFilter().then((restored) => {
      // A choice made while the restore was pending wins over the stored one.
      if (currentFilter === DEFAULT_MARKERS_FILTER) {
        setCurrentFilter(restored);
      }
    });
  }, []);

  return { filter, setFilter: setMarkersFilter };
};
