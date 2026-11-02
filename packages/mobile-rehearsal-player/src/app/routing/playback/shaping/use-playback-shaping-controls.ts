import type { PlayableItem } from '@org/audio-library-models';

import type { usePlaybackShaping } from '../../../library/playback/shaping/use-playback-shaping';
import { useRecordingActive } from '../../../library/recording/use-recording-active';
import {
  resolveShapingLockedReason,
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
  activeItem: Pick<PlayableItem, 'recordingId'> | null = null,
): PlaybackShapingControls => {
  const isRecording = useRecordingActive();
  const lockedReason = resolveShapingLockedReason({ activeItem, isRecording });
  const isLocked = lockedReason !== null;

  return {
    ambient: shaping.ambient,
    canShapePitch: shaping.canShapePitch,
    effective: shaping.effective,
    isItemTransformActive: shaping.isItemTransformActive,
    lockedReason,
    onReset: () => {
      if (isLocked) {
        return;
      }

      shaping.reset().catch(reportShapingFailure);
    },
    onSetPitchSemitones: (semitones) => {
      if (isLocked) {
        return;
      }

      shaping.setPitchSemitones(semitones).catch(reportShapingFailure);
    },
    onSetSpeedMultiplier: (multiplier) => {
      if (isLocked) {
        return;
      }

      shaping.setSpeedMultiplier(multiplier).catch(reportShapingFailure);
    },
  };
};
