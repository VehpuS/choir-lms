import { Platform } from 'react-native';

export type RecordingCapabilities = {
  canRecord: boolean;
};

/**
 * Recording needs the microphone, audio worklets (the shared `PcmSource`), and
 * IndexedDB for the never-purged recordings store. It is web-only for now
 * (rehearsal-recording non-goals); every entry point (the Practice tools row,
 * the strip, the start controls) goes through this check, and nothing asks for
 * the microphone where it is false. Viewing recordings does not depend on it.
 */
export const resolveRecordingCapabilities = (options: {
  platformOs: string | null;
  hasMicrophoneApi: boolean;
  hasAudioWorklet: boolean;
  hasIndexedDb: boolean;
}): RecordingCapabilities => {
  return {
    canRecord:
      options.platformOs === 'web' &&
      options.hasMicrophoneApi &&
      options.hasAudioWorklet &&
      options.hasIndexedDb,
  };
};

export const recordingCapabilities = (): RecordingCapabilities => {
  const browser = globalThis as {
    navigator?: { mediaDevices?: { getUserMedia?: unknown } };
    indexedDB?: unknown;
  };

  return resolveRecordingCapabilities({
    platformOs: Platform.OS,
    hasMicrophoneApi:
      typeof browser.navigator?.mediaDevices?.getUserMedia === 'function',
    hasAudioWorklet:
      'AudioContext' in globalThis && 'AudioWorkletNode' in globalThis,
    hasIndexedDb: browser.indexedDB !== undefined,
  });
};

/** Whether recordings can be stored and listed here, which viewing and Settings need. */
export const recordingsStorageSupported = (): boolean => {
  const browser = globalThis as { indexedDB?: unknown };

  return Platform.OS === 'web' && browser.indexedDB !== undefined;
};
