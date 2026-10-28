import type { PitchFlagStorage } from './pitch-store-types';

export const PITCH_MONITOR_OPEN_KEY = 'choirlms.pitch.monitorOpen';
const OPEN_VALUE = 'true';
const CLOSED_VALUE = 'false';

export type PitchMonitorPreference = {
  isOpen: () => boolean;
  setOpen: (isOpen: boolean) => void;
  /** Reads the stored choice and subscribes at the same time; call once. */
  subscribe: (listener: () => void) => () => void;
};

/**
 * Whether the monitor strip is on, remembered per device. Only this flag is
 * stored: listening is never remembered, so reopening the app never starts the
 * microphone (or its prompt) by itself.
 */
export const createPitchMonitorPreference = (
  storage: PitchFlagStorage,
): PitchMonitorPreference => {
  const listeners = new Set<() => void>();
  let open = false;
  let restored = false;
  let chosen = false;

  const publish = (next: boolean) => {
    open = next;
    listeners.forEach((listener) => listener());
  };

  const restore = () => {
    if (restored) {
      return;
    }

    restored = true;
    void storage
      .getItem(PITCH_MONITOR_OPEN_KEY)
      .then((value) => {
        // A press made before the stored value arrived wins over it.
        if (value === OPEN_VALUE && !chosen) {
          publish(true);
        }
      })
      .catch(() => undefined);
  };

  return {
    isOpen: () => open,
    setOpen: (isOpen) => {
      restored = true;
      chosen = true;
      publish(isOpen);
      void storage
        .setItem(PITCH_MONITOR_OPEN_KEY, isOpen ? OPEN_VALUE : CLOSED_VALUE)
        .catch(() => undefined);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      restore();

      return () => {
        listeners.delete(listener);
      };
    },
  };
};
