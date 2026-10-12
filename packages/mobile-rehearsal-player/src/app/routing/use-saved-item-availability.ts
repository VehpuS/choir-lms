import type { NamedLoop } from '@org/audio-library-models';
import { useEffect, useMemo } from 'react';

import { subscribeToSavedItemRequests } from '../library/components/saved-item-menu/saved-item-requests';
import type { DriveLibrarySource } from '../library/drive/utils/drive-library-view-model';

// Which tracks and loops are saved, for menus outside the Library that offer
// item actions only for saved items, and the one request that brings the
// Library forward (task 8.26).
export const useSavedItemAvailability = (options: {
  onViewTrackLoops: () => void;
  savedLoops: readonly NamedLoop[];
  savedSources: readonly DriveLibrarySource[];
}) => {
  const { onViewTrackLoops, savedLoops, savedSources } = options;
  const savedSourceIds = useMemo(() => {
    return new Set(savedSources.map((source) => source.id));
  }, [savedSources]);
  const savedLoopIds = useMemo(() => {
    return new Set(savedLoops.map((loop) => loop.id));
  }, [savedLoops]);

  useEffect(() => {
    return subscribeToSavedItemRequests((request) => {
      if (request.action === 'view-track-loops') {
        onViewTrackLoops();
      }
    });
  });

  return { savedLoopIds, savedSourceIds };
};
