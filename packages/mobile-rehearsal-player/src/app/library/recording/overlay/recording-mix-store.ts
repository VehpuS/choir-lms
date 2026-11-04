import {
  clampRecordingBalance,
  clampRecordingLevelDb,
} from '@org/audio-library-models';
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
  /** The recording's level in dB that is sounding now, and the one saved with it. */
  levelDb: number;
  savedLevelDb: number;
};

const NONE: RecordingMixState = {
  recordingId: null,
  balance: 50,
  savedBalance: 50,
  levelDb: 0,
  savedLevelDb: 0,
};
const listeners = new Set<() => void>();
let state: RecordingMixState = NONE;

const publish = (next: RecordingMixState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

export const getRecordingMixState = () => state;

/** What a recording is saved with, and what a preview may ask to hear instead. */
export type RecordingMixStart = {
  savedBalance: number;
  savedLevelDb?: number;
  /** A preview of a balance that is not saved yet. */
  startBalance?: number;
  startLevelDb?: number;
};

/** Begins the mix of a playing recording at its saved balance and level, or at what a preview asked for. */
export const startRecordingMix = (
  recordingId: string,
  start: RecordingMixStart,
) => {
  const savedLevelDb = clampRecordingLevelDb(start.savedLevelDb ?? 0);

  publish({
    recordingId,
    balance: clampRecordingBalance(start.startBalance ?? start.savedBalance),
    savedBalance: clampRecordingBalance(start.savedBalance),
    levelDb: clampRecordingLevelDb(start.startLevelDb ?? savedLevelDb),
    savedLevelDb,
  });
};

/** Something outside playback kept this balance and level for the recording. */
export const syncRecordingMixSaved = (
  recordingId: string,
  saved: { balance: number; levelDb?: number },
) => {
  if (state.recordingId === recordingId) {
    publish({
      ...state,
      savedBalance: clampRecordingBalance(saved.balance),
      savedLevelDb: clampRecordingLevelDb(saved.levelDb ?? state.savedLevelDb),
    });
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

/** A live level move for one recording; ignored when another is playing. */
export const setRecordingMixLevelFor = (
  recordingId: string,
  levelDb: number,
) => {
  if (state.recordingId === recordingId) {
    publish({ ...state, levelDb: clampRecordingLevelDb(levelDb) });
  }
};

export const setRecordingMixLevel = (levelDb: number) => {
  if (state.recordingId !== null) {
    publish({ ...state, levelDb: clampRecordingLevelDb(levelDb) });
  }
};

/** The current balance and level are now the recording's saved ones. */
export const markRecordingMixSaved = () => {
  if (state.recordingId !== null) {
    publish({
      ...state,
      savedBalance: state.balance,
      savedLevelDb: state.levelDb,
    });
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
