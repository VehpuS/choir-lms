import { useEffect } from 'react';

import type { SavedRehearsalLibraryView } from '../../library/saved-rehearsal-library/detail-mode';

// Another destination (Recents' `See all`, a tag link) asks the Library to open
// a specific view; each request carries an id so asking twice still applies.
export const useRequestedLibraryView = (options: {
  requestedView: SavedRehearsalLibraryView | null | undefined;
  requestedViewRequestId: number | undefined;
  setSelectedView: (view: SavedRehearsalLibraryView) => void;
}) => {
  const { requestedView, requestedViewRequestId, setSelectedView } = options;

  useEffect(() => {
    if (!requestedView || requestedViewRequestId === undefined) {
      return;
    }

    setSelectedView(requestedView);
  }, [requestedView, requestedViewRequestId, setSelectedView]);
};
