import { useSyncExternalStore } from 'react';

/**
 * What the recording overlay is doing for the playing recording, so the
 * playback sheet can say when the recording's own sound is missing and only
 * the track plays (rehearsal-recording design Decision 13).
 */
export type RecordingOverlayStatus =
  | { kind: 'idle' }
  | { kind: 'sounding' }
  | { kind: 'missing-audio'; message: string };

export const MISSING_RECORDING_AUDIO_MESSAGE =
  'This recording’s audio could not be read, so only the track plays. You can still export what was saved.';

const IDLE: RecordingOverlayStatus = { kind: 'idle' };
const listeners = new Set<() => void>();
let status: RecordingOverlayStatus = IDLE;

export const getRecordingOverlayStatus = () => status;

export const setRecordingOverlayStatus = (next: RecordingOverlayStatus) => {
  status = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const useRecordingOverlayStatus = (): RecordingOverlayStatus => {
  return useSyncExternalStore(subscribe, getRecordingOverlayStatus, () => IDLE);
};
