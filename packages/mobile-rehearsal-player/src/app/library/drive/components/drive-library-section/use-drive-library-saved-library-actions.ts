import { type NamedLoop } from '@org/audio-library-models';
import { useState } from 'react';

import { useLibraryFilesConfirmationFlow } from '../../../components/saved-rehearsal-library-section/use-library-files-confirmation-flow';
import { getSavedLoopRemovalCopy } from '../../../loops/utils/saved-loop-view-model';
import {
  getSavedRehearsalLibraryDependentLoops,
  getSavedRehearsalLibraryRemovalCopy,
} from '../../../saved-rehearsal-library/view-model';
import type { DriveLibrarySource } from '../../utils/drive-library-view-model';

type UseDriveLibrarySavedLibraryActionsOptions = {
  deleteLoop: (loop: NamedLoop) => void;
  refreshLoops: () => Promise<void>;
  refreshPlaylists: () => Promise<unknown>;
  removeSource: (source: DriveLibrarySource) => Promise<boolean>;
  savedLoops: NamedLoop[];
};

export const useDriveLibrarySavedLibraryActions = ({
  deleteLoop,
  refreshLoops,
  refreshPlaylists,
  removeSource,
  savedLoops,
}: UseDriveLibrarySavedLibraryActionsOptions) => {
  const [selectedLoopSourceId, setSelectedLoopSourceId] = useState<
    string | null
  >(null);
  const confirmationFlow = useLibraryFilesConfirmationFlow();

  return {
    confirmationDialog: confirmationFlow.confirmationDialog,
    selectedLoopSourceId,
    setSelectedLoopSourceId,
    confirmRemoveLoop(loop: NamedLoop) {
      const removalCopy = getSavedLoopRemovalCopy(loop);

      confirmationFlow.requestConfirmation({
        content: removalCopy,
        onConfirm: () => {
          deleteLoop(loop);
        },
      });
    },
    confirmRemoveSource(source: DriveLibrarySource) {
      const removalCopy = getSavedRehearsalLibraryRemovalCopy({
        dependentLoops: getSavedRehearsalLibraryDependentLoops(
          savedLoops,
          source.id,
        ),
        source,
      });

      confirmationFlow.requestConfirmation({
        content: removalCopy,
        onConfirm: async () => {
          const didRemove = await removeSource(source);

          if (!didRemove) {
            return;
          }

          setSelectedLoopSourceId((currentValue) => {
            return currentValue === source.id ? null : currentValue;
          });

          await refreshLoops();
          await refreshPlaylists();
        },
      });
    },
  };
};
