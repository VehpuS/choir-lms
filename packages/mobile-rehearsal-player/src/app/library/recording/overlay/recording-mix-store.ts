import { clampRecordingBalance } from '@org/audio-library-models';
import { useSyncExternalStore } from 'react';

/**
 * The balance of the recording that is playing, shared by the control that
 * moves it and the host that applies it. It starts from the balance saved with
 * the recording and changes only for this listening session; the saved value
 * changes only when the user keeps it (`markRecordingMixSaved`).
 */
export type RecordingMixState = {
  recordingId: string | null;
  /** What is sounding now. */
  balance: number;
  /** What is saved with the recording. */
  savedBalance: number;
};

const NONE: RecordingMixState = {
  recordingId: null,
  balance: 50,
  savedBalance: 50,
};
const listeners = new Set<() => void>();
let state: RecordingMixState = NONE;

const publish = (next: RecordingMixState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

export const getRecordingMixState = () => state;

/**
 * Begins the mix of a playing recording at its saved balance, or at
 * `startBalance` when a preview asked to hear a balance that is not saved yet.
 */
export const startRecordingMix = (
  recordingId: string,
  savedBalance: number,
  startBalance: number = savedBalance,
) => {
  publish({
    recordingId,
    balance: clampRecordingBalance(startBalance),
    savedBalance: clampRecordingBalance(savedBalance),
  });
};

/** Something outside playback kept this balance for the recording. */
export const syncRecordingMixSaved = (recordingId: string, balance: number) => {
  if (state.recordingId === recordingId) {
    publish({ ...state, savedBalance: clampRecordingBalance(balance) });
  }
};

/** A live move for one recording; ignored when another is playing. */
export const setRecordingMixBalanceFor = (
  recordingId: string,
  balance: number,
) => {
  if (state.recordingId === recordingId) {
    publish({ ...state, balance: clampRecordingBalance(balance) });
  }
};

/** The current position is now the recording's saved balance. */
export const markRecordingMixSaved = () => {
  if (state.recordingId !== null) {
    publish({ ...state, savedBalance: state.balance });
  }
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
