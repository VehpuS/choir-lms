import type { NamedLoop } from '@org/audio-library-models';
import { useEffect, useMemo } from 'react';

import { resolveSourceLyrics } from '../library/lyrics/hooks/use-source-lyrics';

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

  // A track, adjusted track, or loop shows the lyrics of its owning track.
  const lyricsFor = (sourceId: string) => {
    return resolveSourceLyrics({ id: sourceId, sourceId }, savedSources);
  };
  const hasLyricsFor = (sourceId: string) => {
    return lyricsFor(sourceId).lyrics !== undefined;
  };

  return { hasLyricsFor, lyricsFor, savedLoopIds, savedSourceIds };
};
