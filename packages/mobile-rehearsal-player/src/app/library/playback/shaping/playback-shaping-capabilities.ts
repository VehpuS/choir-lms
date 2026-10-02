/**
 * Semitone pitch shifting is a web-only capability in this app, on purpose
 * (design Decision 6, tasks 5.0 and 8.51).
 *
 * Why native cannot do it: iOS plays through `SwiftAudioEx`, which wraps
 * `AVPlayer` (rate and a time-pitch algorithm only, no `AVAudioUnitTimePitch`),
 * and `react-native-track-player` exposes no pitch control on Android either.
 * Native pitch needs new native modules and is deferred until native becomes a
 * priority. Speed (pitch-preserving) works on every platform.
 *
 * Every pitch entry point must go through this check and the shaping UI shows
 * an inert pitch control with a stated reason where it is false, so a platform
 * never silently applies a pitch change it cannot honor.
 */
export const canShapePitchOnPlatform = (options: {
  hasAudioWorklet: boolean;
  platformOs: string | null;
}) => {
  return options.platformOs === 'web' && options.hasAudioWorklet;
};

/** Shown beside the inert pitch control where `canShapePitch` is false. */
export const PITCH_UNAVAILABLE_REASON = 'Not available on this device yet';
