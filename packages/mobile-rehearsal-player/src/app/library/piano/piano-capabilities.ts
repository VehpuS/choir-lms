import { Platform } from 'react-native';

export type PianoCapabilities = {
  canPlay: boolean;
};

/**
 * Piano sound is web-only for now (design Decision 5): native has no Web
 * Audio, and bundled-sample native audio is tracked in
 * `native-playback-follow-ups`. Every piano entry point (the playback and
 * mini-player controls, the viewer toggle, note tapping) goes through this
 * check so a platform never shows a control that cannot make sound.
 */
export const resolvePianoCapabilities = (options: {
  platformOs: string | null;
  hasAudioContext: boolean;
}): PianoCapabilities => {
  return {
    canPlay: options.platformOs === 'web' && options.hasAudioContext,
  };
};

export const pianoCapabilities = (): PianoCapabilities => {
  return resolvePianoCapabilities({
    platformOs: Platform.OS,
    hasAudioContext: 'AudioContext' in globalThis,
  });
};
