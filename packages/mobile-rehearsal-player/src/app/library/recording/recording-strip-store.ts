import { useSyncExternalStore } from 'react';

import { disarmPunch } from './punch/punch-instance';
import { getRecordingSession } from './recording-session-instance';

const listeners = new Set<() => void>();
let isOpen = false;

const publish = (next: boolean) => {
  isOpen = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/**
 * Whether the recording strip is on (the Recording row in Practice tools). Not
 * remembered between launches: recording never starts or arms itself, and
 * reopening the app always begins with the strip closed.
 */
export const isRecordingStripOpen = () => isOpen;

export const openRecordingStrip = () => publish(true);

/** Closing the strip while recording stops the recording first, keeping it. */
export const closeRecordingStrip = () => {
  disarmPunch();
  void getRecordingSession().stop();
  getRecordingSession().dismiss();
  publish(false);
};

export const toggleRecordingStrip = () => {
  if (isOpen) {
    closeRecordingStrip();
  } else {
    openRecordingStrip();
  }
};

export const useRecordingStripOpen = (): boolean => {
  return useSyncExternalStore(subscribe, isRecordingStripOpen, () => false);
};
