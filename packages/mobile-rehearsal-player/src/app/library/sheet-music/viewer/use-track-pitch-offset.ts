import { useSyncExternalStore } from 'react';

import { getPlaybackShapingSession } from '../../playback/shaping';
import { usePitchMonitorOpen } from '../../pitch/use-pitch';
import { getOffsetLabel } from '../renderers/score-pitch-marks';

/**
 * How many semitones the playing item's pitch is shifted, for the score to
 * follow. It is the session's effective pitch (the item's own transform, else
 * the ambient setting), and zero where the platform cannot shift pitch or when
 * nothing is loaded to play. Speed never changes pitch, so it never counts.
 */
export const useTrackPitchOffset = (hasPlayingItem: boolean): number => {
  const session = getPlaybackShapingSession();
  const sessionOffset = useSyncExternalStore(session.subscribe, () => {
    const { canShapePitch, effective } = session.getState();

    return canShapePitch ? effective.pitchSemitones : 0;
  });

  return hasPlayingItem ? sessionOffset : 0;
};

/**
 * `Following track pitch −2 st`, while the track is shifted, a score (not a
 * PDF) is showing, and pitch detection is on so the marks are in use.
 */
export const useOffsetLabel = (
  isScore: boolean,
  pitchOffset: number,
): string | null => {
  const isMonitorOpen = usePitchMonitorOpen();

  return isScore && isMonitorOpen ? getOffsetLabel(pitchOffset) : null;
};

/** The pitch offset to follow and the label to show for it. */
export const usePitchFollow = (isScore: boolean, hasPlayingItem: boolean) => {
  const pitchOffset = useTrackPitchOffset(hasPlayingItem);

  return { pitchOffset, offsetLabel: useOffsetLabel(isScore, pitchOffset) };
};
