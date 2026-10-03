import type { usePlaybackShaping } from '../../../library/playback/shaping/use-playback-shaping';
import type { PlaybackShapingControls } from './shaping-surface-model';

// Shaping changes can fail (for example the web pitch processor not loading);
// the setting stays recorded and the next load applies it.
const reportShapingFailure = (error: unknown) => {
  console.warn('Playback shaping could not be applied.', error);
};

/** Adapts the session hook's promise-returning setters to the surfaces' callbacks. */
export const usePlaybackShapingControls = (
  shaping: ReturnType<typeof usePlaybackShaping>,
): PlaybackShapingControls => {
  return {
    ambient: shaping.ambient,
    canShapePitch: shaping.canShapePitch,
    effective: shaping.effective,
    isItemTransformActive: shaping.isItemTransformActive,
    onReset: () => {
      shaping.reset().catch(reportShapingFailure);
    },
    onSetPitchSemitones: (semitones) => {
      shaping.setPitchSemitones(semitones).catch(reportShapingFailure);
    },
    onSetSpeedMultiplier: (multiplier) => {
      shaping.setSpeedMultiplier(multiplier).catch(reportShapingFailure);
    },
  };
};
