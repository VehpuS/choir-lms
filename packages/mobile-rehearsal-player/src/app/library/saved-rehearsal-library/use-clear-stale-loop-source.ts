import { useEffect } from 'react';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import { isSelectedLoopSourceStale } from './selected-loop-source';

// Whichever path removed the track (single, bulk, last-link delete), the loop
// builder must stop remembering it.
export const useClearStaleLoopSource = (options: {
  isLibraryLoading: boolean;
  savedSources: readonly Pick<DriveLibrarySource, 'id'>[];
  selectedLoopSourceId: string | null;
  setSelectedLoopSourceId: (sourceId: string | null) => void;
}) => {
  const {
    isLibraryLoading,
    savedSources,
    selectedLoopSourceId,
    setSelectedLoopSourceId,
  } = options;

  useEffect(() => {
    if (
      isSelectedLoopSourceStale({
        isLibraryLoading,
        savedSourceIds: savedSources.map(({ id }) => id),
        selectedLoopSourceId,
      })
    ) {
      setSelectedLoopSourceId(null);
    }
  }, [
    isLibraryLoading,
    savedSources,
    selectedLoopSourceId,
    setSelectedLoopSourceId,
  ]);
};
