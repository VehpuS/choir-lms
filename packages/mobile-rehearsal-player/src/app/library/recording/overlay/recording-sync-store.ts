import { clampNudgeMs } from '@org/audio-library-models';
import { useSyncExternalStore } from 'react';

/**
 * The sync nudge of the recording that is playing, shared by the control that
 * moves it and the host that applies it. Unlike the balance, a nudge is saved
 * with the recording as it moves (the control writes it), so there is no
 * separate saved value here.
 */
export type RecordingSyncState = {
  recordingId: string | null;
  nudgeMs: number;
};

const NONE: RecordingSyncState = { recordingId: null, nudgeMs: 0 };
const listeners = new Set<() => void>();
let state: RecordingSyncState = NONE;

const publish = (next: RecordingSyncState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

export const getRecordingSyncState = () => state;

export const startRecordingSync = (recordingId: string, nudgeMs: number) => {
  publish({ recordingId, nudgeMs: clampNudgeMs(nudgeMs) });
};

export const setRecordingNudge = (nudgeMs: number) => {
  if (state.recordingId !== null) {
    publish({ ...state, nudgeMs: clampNudgeMs(nudgeMs) });
  }
};

export const clearRecordingSync = () => {
  publish(NONE);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const useRecordingSyncState = (): RecordingSyncState => {
  return useSyncExternalStore(subscribe, getRecordingSyncState, () => NONE);
};
