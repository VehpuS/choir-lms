import { useSyncExternalStore } from 'react';

import {
  DEFAULT_VOICE_PART_PREFERENCES,
  type VoicePartPreferences,
} from './voice-part-preferences';
import {
  persistVoicePartPreferences,
  restoreVoicePartPreferences,
} from './voice-part-preferences-storage';

// One device-wide copy shared by the viewer and Settings, so a change in one
// shows in the other at once (same pattern as the lyrics text size).
let current: VoicePartPreferences = DEFAULT_VOICE_PART_PREFERENCES;
let hasRestored = false;
let hasChangedBeforeRestore = false;
const listeners = new Set<() => void>();

const publish = (next: VoicePartPreferences) => {
  current = next;
  listeners.forEach((listener) => {
    listener();
  });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  if (!hasRestored) {
    hasRestored = true;
    void restoreVoicePartPreferences().then((restored) => {
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

export const updateVoicePartPreferences = (
  change: Partial<VoicePartPreferences>,
) => {
  hasChangedBeforeRestore = true;

  const next = { ...current, ...change };

  if (
    next.defaultVoice === current.defaultVoice &&
    next.latestVoice === current.latestVoice
  ) {
    return;
  }

  publish(next);
  void persistVoicePartPreferences(next);
};

export const useVoicePartPreferences = (): VoicePartPreferences => {
  return useSyncExternalStore(subscribe, () => current);
};
