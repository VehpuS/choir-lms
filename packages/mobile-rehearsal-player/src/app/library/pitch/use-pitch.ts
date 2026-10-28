import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { appVisibility } from './app-visibility';
import {
  createPitchMonitorPreference,
  type PitchMonitorPreference,
} from './pitch-monitor-preference';
import { getPcmSource } from './pcm-source';
import {
  createPitchSettingsStore,
  type PitchSettings,
  type PitchSettingsStore,
} from './pitch-settings';
import {
  createPitchStore,
  type PitchState,
  type PitchStore,
} from './pitch-store';

let shared: PitchStore | null = null;
let sharedSettings: PitchSettingsStore | null = null;

/** The pitch settings kept on the device; created on first use. */
export const getPitchSettings = (): PitchSettingsStore => {
  sharedSettings ??= createPitchSettingsStore(AsyncStorage);

  return sharedSettings;
};

/** The one store every pitch surface reads; created on first use. */
export const getPitchStore = (): PitchStore => {
  if (!shared) {
    shared = createPitchStore({
      source: getPcmSource(),
      visibility: appVisibility,
      storage: AsyncStorage,
    });

    // The remembered cutoff applies to the pipeline once it is read.
    const store = shared;

    void getPitchSettings()
      .load()
      .then((settings) => store.setLevelCutoffDb(settings.levelCutoffDb));
  }

  return shared;
};

/** Saves the minimum volume and applies it to the running pipeline. */
export const setPitchLevelCutoffDb = (levelCutoffDb: number) => {
  getPitchSettings().set({ levelCutoffDb });
  getPitchStore().setLevelCutoffDb(levelCutoffDb);
};

/** The live input level (dBFS); redraws on every frame, so read it sparingly. */
export const usePitchLevelDb = (): number => {
  const store = getPitchStore();

  return useSyncExternalStore(store.subscribeLevel, store.getLevelDb);
};

export const usePitchSettings = (): PitchSettings => {
  const settings = getPitchSettings();

  return useSyncExternalStore(settings.subscribe, settings.get);
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
