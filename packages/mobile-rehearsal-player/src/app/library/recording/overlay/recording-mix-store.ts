import { clampRecordingBalance } from '@org/audio-library-models';
import { useSyncExternalStore } from 'react';

/**
 * The balance of the recording that is playing, shared by the control that
 * sets it and the host that applies it. It starts from the balance saved with
 * the recording and is written back when the user lets go of the slider.
 */
export type RecordingMixState = {
  recordingId: string | null;
  balance: number;
};

const NONE: RecordingMixState = { recordingId: null, balance: 50 };
const listeners = new Set<() => void>();
let state: RecordingMixState = NONE;

const publish = (next: RecordingMixState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

export const getRecordingMixState = () => state;

export const startRecordingMix = (recordingId: string, balance: number) => {
  publish({ recordingId, balance: clampRecordingBalance(balance) });
};

export const setRecordingMixBalance = (balance: number) => {
  if (state.recordingId !== null) {
    publish({ ...state, balance: clampRecordingBalance(balance) });
  }
};

export const clearRecordingMix = () => {
  publish(NONE);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const useRecordingMixState = (): RecordingMixState => {
  return useSyncExternalStore(subscribe, getRecordingMixState, () => NONE);
};
