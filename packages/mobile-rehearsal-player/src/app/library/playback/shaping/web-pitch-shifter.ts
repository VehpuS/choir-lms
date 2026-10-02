import type { PlaybackPitchShifter } from './playback-shaping-types';

/**
 * Native has no pitch shifter on purpose (tasks 8.51): the engine reports
 * `canShapePitch === false` and the shaping UI shows its inert fallback. The
 * web implementation lives in `web-pitch-shifter.web.ts`.
 */
export const createDefaultPitchShifter = (): PlaybackPitchShifter | null => {
  return null;
};
