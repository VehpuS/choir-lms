import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { appVisibility } from './app-visibility';
import {
  createPitchMonitorPreference,
  type PitchMonitorPreference,
} from './pitch-monitor-preference';
import { getPcmSource } from './pcm-source';
import {
  createPitchStore,
  type PitchState,
  type PitchStore,
} from './pitch-store';

let shared: PitchStore | null = null;

/** The one store every pitch surface reads; created on first use. */
export const getPitchStore = (): PitchStore => {
  shared ??= createPitchStore({
    source: getPcmSource(),
    visibility: appVisibility,
    storage: AsyncStorage,
  });

  return shared;
};

/**
 * Reads the pitch state. Mounting registers a consumer, so the microphone
 * can only be open while at least one surface using this hook is mounted.
 */
export const usePitch = (): { state: PitchState; store: PitchStore } => {
  const store = getPitchStore();
  const state = useSyncExternalStore(store.subscribe, store.getState);

  useEffect(() => store.acquire(), [store]);

  return { state, store };
};

let sharedMonitorPreference: PitchMonitorPreference | null = null;

/** Whether the monitor strip is on, remembered per device; created on first use. */
export const getPitchMonitorPreference = (): PitchMonitorPreference => {
  sharedMonitorPreference ??= createPitchMonitorPreference(AsyncStorage);

  return sharedMonitorPreference;
};

export const usePitchMonitorOpen = (): boolean => {
  const preference = getPitchMonitorPreference();

  return useSyncExternalStore(preference.subscribe, preference.isOpen);
};
