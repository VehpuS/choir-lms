import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { appVisibility } from './app-visibility';
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
