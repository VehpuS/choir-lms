import type { RawMediaDevice } from './microphone-choice-model';

// Native has no microphone capture yet (see `pcm-source.ts`), so there are no
// inputs to list.
export const listMediaDevices = (): Promise<RawMediaDevice[]> => {
  return Promise.resolve([]);
};

export const probeMicrophone = (): Promise<void> => Promise.resolve();

export const onMicrophoneDevicesChanged = (listener: () => void) => {
  void listener;

  return () => undefined;
};
