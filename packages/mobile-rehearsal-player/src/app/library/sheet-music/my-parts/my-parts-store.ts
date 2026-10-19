import { useSyncExternalStore } from 'react';

import {
  DEFAULT_MY_PARTS_PREFERENCES,
  type MyPartsPreferences,
} from './my-parts-model';
import {
  persistMyPartsPreferences,
  restoreMyPartsPreferences,
} from './my-parts-storage';

// One device-wide copy shared by the viewer and Settings, so a change in one
// shows in the other at once (same pattern as the lyrics text size).
let current: MyPartsPreferences = DEFAULT_MY_PARTS_PREFERENCES;
let hasRestored = false;
let hasChangedBeforeRestore = false;
const listeners = new Set<() => void>();

const publish = (next: MyPartsPreferences) => {
  current = next;
  listeners.forEach((listener) => {
    listener();
  });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  if (!hasRestored) {
    hasRestored = true;
    void restoreMyPartsPreferences().then((restored) => {
      // A change made while the read was pending must not be overwritten by it.
      if (!hasChangedBeforeRestore) {
        publish(restored);
      }
    });
  }

  return () => {
    listeners.delete(listener);
  };
};

export const updateMyPartsPreferences = (
  change: Partial<MyPartsPreferences>,
) => {
  hasChangedBeforeRestore = true;

  const next = { ...current, ...change };

  publish(next);
  void persistMyPartsPreferences(next);
};

export const useMyPartsPreferences = (): MyPartsPreferences => {
  return useSyncExternalStore(subscribe, () => current);
};
