import type { NamedLoop } from '@org/audio-library-models';
import { useState } from 'react';

import { createTrackRemoveFromLibraryConfirmation } from '../components/saved-rehearsal-library-section/library-files-delete-copy';
import { useLibraryFilesConfirmationFlow } from '../selection/use-library-files-confirmation-flow';
import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import { getSavedLoopRemovalCopy } from '../loops/utils/saved-loop-view-model';
import type { UseLibraryFilesResult } from './use-library-files';

type UseSavedRehearsalLibraryRemovalActionsOptions = {
  deleteLoop: (loop: NamedLoop) => void;
  getTrackRemoveImpact: UseLibraryFilesResult['getTrackRemoveFromLibraryImpact'];
  refreshLoops: () => Promise<void>;
  refreshPlaylists: () => Promise<unknown>;
  removeSource: (source: DriveLibrarySource) => Promise<boolean>;
};

export const useSavedRehearsalLibraryRemovalActions = ({
  deleteLoop,
  getTrackRemoveImpact,
  refreshLoops,
  refreshPlaylists,
  removeSource,
}: UseSavedRehearsalLibraryRemovalActionsOptions) => {
  const [selectedLoopSourceId, setSelectedLoopSourceId] = useState<
    string | null
  >(null);
  const confirmationFlow = useLibraryFilesConfirmationFlow();

  const removeSourceWithoutConfirmation = async (
    source: DriveLibrarySource,
  ) => {
    const didRemove = await removeSource(source);

    if (!didRemove) {
      return;
    }

    setSelectedLoopSourceId((currentValue) => {
      return currentValue === source.id ? null : currentValue;
    });

    await refreshLoops();
    await refreshPlaylists();
  };

  return {
    confirmationDialog: confirmationFlow.confirmationDialog,
    confirmRemoveLoop(loop: NamedLoop) {
      const removalCopy = getSavedLoopRemovalCopy(loop);

      confirmationFlow.requestConfirmation({
        content: removalCopy,
        onConfirm: () => {
          deleteLoop(loop);
        },
      });
    },
    // The confirmation lives with whoever asked (this hook for Tracks and Add,
    // the Files row flow for Files); the removal itself never asks.
    confirmRemoveSource(source: DriveLibrarySource) {
      confirmationFlow.requestConfirmation({
        content: createTrackRemoveFromLibraryConfirmation(
          { source },
          getTrackRemoveImpact(source.id),
        ),
        onConfirm: () => removeSourceWithoutConfirmation(source),
      });
    },
    removeSourceWithoutConfirmation,
    selectedLoopSourceId,
    setSelectedLoopSourceId,
  };
};
