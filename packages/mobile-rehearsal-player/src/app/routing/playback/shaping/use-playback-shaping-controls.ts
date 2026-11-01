import type { usePlaybackShaping } from '../../../library/playback/shaping/use-playback-shaping';
import { useRecordingActive } from '../../../library/recording/use-recording-active';
import {
  SHAPING_LOCKED_WHILE_RECORDING,
  type PlaybackShapingControls,
} from './shaping-surface-model';

// Shaping changes can fail (for example the web pitch processor not loading);
// the setting stays recorded and the next load applies it.
const reportShapingFailure = (error: unknown) => {
  console.warn('Playback shaping could not be applied.', error);
};

/** Adapts the session hook's promise-returning setters to the surfaces' callbacks. */
export const usePlaybackShapingControls = (
  shaping: ReturnType<typeof usePlaybackShaping>,
): PlaybackShapingControls => {
  const isRecording = useRecordingActive();

  return {
    ambient: shaping.ambient,
    canShapePitch: shaping.canShapePitch,
    effective: shaping.effective,
    isItemTransformActive: shaping.isItemTransformActive,
    lockedReason: isRecording ? SHAPING_LOCKED_WHILE_RECORDING : null,
    onReset: () => {
      if (isRecording) {
        return;
      }

      shaping.reset().catch(reportShapingFailure);
    },
    onSetPitchSemitones: (semitones) => {
      if (isRecording) {
        return;
      }

      shaping.setPitchSemitones(semitones).catch(reportShapingFailure);
    },
    onSetSpeedMultiplier: (multiplier) => {
      if (isRecording) {
        return;
      }

      shaping.setSpeedMultiplier(multiplier).catch(reportShapingFailure);
    },
  };
};
