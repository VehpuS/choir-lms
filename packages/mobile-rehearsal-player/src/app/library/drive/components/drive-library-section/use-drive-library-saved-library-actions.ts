import { type NamedLoop } from '@org/audio-library-models';
import { useState } from 'react';
import { Alert } from 'react-native';

import { getSavedLoopRemovalCopy } from '../../../loops/utils/saved-loop-view-model';
import {
  getSavedRehearsalLibraryDependentLoops,
  getSavedRehearsalLibraryRemovalCopy,
} from '../../../utils/saved-rehearsal-library-view-model';
import type { DriveLibrarySource } from '../../utils/drive-library-view-model';

type UseDriveLibrarySavedLibraryActionsOptions = {
  deleteLoop: (loop: NamedLoop) => void;
  refreshLoops: () => Promise<void>;
  removeSource: (source: DriveLibrarySource) => Promise<boolean>;
  savedLoops: NamedLoop[];
};

export const useDriveLibrarySavedLibraryActions = ({
  deleteLoop,
  refreshLoops,
  removeSource,
  savedLoops,
}: UseDriveLibrarySavedLibraryActionsOptions) => {
  const [selectedLoopSourceId, setSelectedLoopSourceId] = useState<
    string | null
  >(null);

  return {
    selectedLoopSourceId,
    setSelectedLoopSourceId,
    confirmRemoveLoop(loop: NamedLoop) {
      const removalCopy = getSavedLoopRemovalCopy(loop);

      Alert.alert(removalCopy.title, removalCopy.message, [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: removalCopy.confirmLabel,
          style: 'destructive',
          onPress: () => {
            void deleteLoop(loop);
          },
        },
      ]);
    },
    confirmRemoveSource(source: DriveLibrarySource) {
      const removalCopy = getSavedRehearsalLibraryRemovalCopy({
        dependentLoops: getSavedRehearsalLibraryDependentLoops(
          savedLoops,
          source.id,
        ),
        source,
      });

      Alert.alert(removalCopy.title, removalCopy.message, [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: removalCopy.confirmLabel,
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const didRemove = await removeSource(source);

              if (!didRemove) {
                return;
              }

              setSelectedLoopSourceId((currentValue) => {
                return currentValue === source.id ? null : currentValue;
              });

              await refreshLoops();
            })();
          },
        },
      ]);
    },
  };
};
