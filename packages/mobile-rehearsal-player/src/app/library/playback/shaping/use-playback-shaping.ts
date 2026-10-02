import { useCallback, useSyncExternalStore } from 'react';

import { getPlaybackShapingSession } from './index';

/**
 * The playback session's ambient speed and pitch for React. The setters accept
 * any number and clamp to the product ranges; where pitch cannot be shifted
 * (`canShapePitch` false) the pitch setter leaves the value at 0.
 */
export const usePlaybackShaping = () => {
  const session = getPlaybackShapingSession();
  const state = useSyncExternalStore(
    session.subscribe,
    session.getState,
    session.getState,
  );
  const setSpeedMultiplier = useCallback(
    (multiplier: number) => session.setSpeedMultiplier(multiplier),
    [session],
  );
  const setPitchSemitones = useCallback(
    (semitones: number) => session.setPitchSemitones(semitones),
    [session],
  );
  const reset = useCallback(() => session.reset(), [session]);

  return { ...state, reset, setPitchSemitones, setSpeedMultiplier };
};
