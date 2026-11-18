import { useSyncExternalStore } from 'react';

/**
 * A test switch, kept in memory only (clear-playback-while-listening): keeps
 * tracks on the media element while a microphone is open, so one real track
 * can be compared on the media element and on the engine in the same
 * session. It is offered in the Sound check and is off after every reload.
 */
let isEngineOff = false;
const listeners = new Set<() => void>();

export const isListeningEngineOffForTest = (): boolean => isEngineOff;

export const setListeningEngineOffForTest = (next: boolean) => {
  if (next !== isEngineOff) {
    isEngineOff = next;
    listeners.forEach((listener) => listener());
  }
};

export const subscribeListeningOverride = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const useListeningEngineOffForTest = (): boolean =>
  useSyncExternalStore(
    subscribeListeningOverride,
    isListeningEngineOffForTest,
    isListeningEngineOffForTest,
  );
