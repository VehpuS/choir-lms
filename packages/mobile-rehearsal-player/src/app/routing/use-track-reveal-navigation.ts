import { useEffect, useRef } from 'react';

import { useTrackRevealRequest } from '../library/saved-rehearsal-library/track-reveal-store';

/**
 * `Show original track` from a stem: opens the Library on the Tracks view; the
 * row then scrolls itself into view (composite-tracks 12.8).
 */
export const useTrackRevealNavigation = (navigation: {
  openLibrary: () => void;
  openTracksView: () => void;
}) => {
  const reveal = useTrackRevealRequest();
  // The callbacks are fresh each render; the request id is the only trigger.
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;
  const requestId = reveal?.requestId;

  useEffect(() => {
    if (requestId === undefined) {
      return;
    }

    navigationRef.current.openLibrary();
    navigationRef.current.openTracksView();
  }, [requestId]);
};
