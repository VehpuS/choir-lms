import type { NamedLoop } from '@org/audio-library-models';
import { useState } from 'react';

import { useLibraryFilesConfirmationFlow } from '../components/saved-rehearsal-library-section/use-library-files-confirmation-flow';
import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import { getSavedLoopRemovalCopy } from '../loops/utils/saved-loop-view-model';
import {
  getSavedRehearsalLibraryDependentLoops,
  getSavedRehearsalLibraryRemovalCopy,
} from './view-model';

type UseSavedRehearsalLibraryRemovalActionsOptions = {
  deleteLoop: (loop: NamedLoop) => void;
  refreshLoops: () => Promise<void>;
  refreshPlaylists: () => Promise<unknown>;
  removeSource: (source: DriveLibrarySource) => Promise<boolean>;
  savedLoops: NamedLoop[];
};

export const useSavedRehearsalLibraryRemovalActions = ({
  deleteLoop,
  refreshLoops,
  refreshPlaylists,
  removeSource,
  savedLoops,
}: UseSavedRehearsalLibraryRemovalActionsOptions) => {
  const [selectedLoopSourceId, setSelectedLoopSourceId] = useState<
    string | null
  >(null);
  const confirmationFlow = useLibraryFilesConfirmationFlow();

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
    selectedLoopSourceId,
    setSelectedLoopSourceId,
  };
};
