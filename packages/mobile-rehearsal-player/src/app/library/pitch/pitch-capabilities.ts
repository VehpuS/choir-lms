import { Platform } from 'react-native';

export type PitchCapabilities = {
  canListen: boolean;
};

/**
 * Listening is web-only for now (design Decision 10): native microphone
 * capture is tracked in `native-playback-follow-ups`. Every pitch entry point
 * (the Practice tools row, the monitor, the detected states) goes through this
 * check so a platform never shows a control that cannot listen, and nothing
 * requests the microphone where it is false.
 */
export const resolvePitchCapabilities = (options: {
  platformOs: string | null;
  hasMicrophoneApi: boolean;
  hasAudioWorklet: boolean;
}): PitchCapabilities => {
  return {
    canListen:
      options.platformOs === 'web' &&
      options.hasMicrophoneApi &&
      options.hasAudioWorklet,
  };
};

export const pitchCapabilities = (): PitchCapabilities => {
  const browser = globalThis as {
    navigator?: { mediaDevices?: { getUserMedia?: unknown } };
  };

  return resolvePitchCapabilities({
    platformOs: Platform.OS,
    hasMicrophoneApi:
      typeof browser.navigator?.mediaDevices?.getUserMedia === 'function',
    hasAudioWorklet:
      'AudioContext' in globalThis && 'AudioWorkletNode' in globalThis,
  });
};
