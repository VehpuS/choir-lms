import { useSyncExternalStore } from 'react';

import { getRecordingSession } from './recording-session-instance';

/** True while a recording is in progress, for surfaces that lock until it stops. */
export const useRecordingActive = (): boolean => {
  const session = getRecordingSession();

  return useSyncExternalStore(
    session.subscribe,
    () => session.getState().phase === 'recording',
    () => false,
  );
};
