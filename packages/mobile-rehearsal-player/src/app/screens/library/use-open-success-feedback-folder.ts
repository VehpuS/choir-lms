import { useCallback } from 'react';

import type { SavedRehearsalLibraryView } from '../../library/saved-rehearsal-library/detail-mode';

// The `Open` action on a Files success card: show Files, open the folder the
// card names, and retire the card.
export const useOpenSuccessFeedbackFolder = (options: {
  dismiss: () => void;
  openFolder: (folderId: string) => void;
  setSelectedView: (view: SavedRehearsalLibraryView) => void;
}) => {
  const { dismiss, openFolder, setSelectedView } = options;

  return useCallback(
    (folderId: string) => {
      if (!folderId) {
        return;
      }

      setSelectedView('files');
      openFolder(folderId);
      dismiss();
    },
    [dismiss, openFolder, setSelectedView],
  );
};
