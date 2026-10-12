import {
  resolveLyricsOwner,
  type SourceLyrics,
  type SourceLyricsOrigin,
} from '@org/audio-library-models';
import { useCallback } from 'react';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  enqueueLibraryWrite,
  practiceRepository,
} from '../../saved-rehearsal-library/use-saved-rehearsal-library';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../storage/local-library-storage';

/** A track, adjusted track, or loop: anything whose lyrics resolve to a track. */
export type LyricsItem = { id: string } & (
  | { sourceId: string; adjustment?: undefined }
  | { adjustment?: { sourceRef: string }; sourceId?: undefined }
);

export type SourceLyricsResolution = {
  lyrics: SourceLyrics | undefined;
  /** The saved track that owns the lyrics, or null when it no longer exists. */
  owner: DriveLibrarySource | null;
};

export const resolveSourceLyrics = (
  item: LyricsItem,
  savedSources: readonly DriveLibrarySource[],
): SourceLyricsResolution => {
  const owner = resolveLyricsOwner(item, savedSources);

  return { lyrics: owner?.lyrics, owner };
};

type UseSourceLyricsOptions = {
  canMutateLibrary: boolean;
  refreshSources: () => Promise<void>;
  savedSources: readonly DriveLibrarySource[];
};

export const useSourceLyrics = ({
  canMutateLibrary,
  refreshSources,
  savedSources,
}: UseSourceLyricsOptions) => {
  const lyricsFor = useCallback(
    (item: LyricsItem) => resolveSourceLyrics(item, savedSources),
    [savedSources],
  );

  // Edits always land on the owning track, so a loop or adjusted track being
  // played edits its parent's lyrics (design Decision 2).
  const writeLyrics = useCallback(
    async (
      item: LyricsItem,
      write: (ownerId: string) => Promise<unknown>,
    ): Promise<boolean> => {
      const { owner } = resolveSourceLyrics(item, savedSources);

      if (!canMutateLibrary || !owner) {
        return false;
      }

      try {
        await enqueueLibraryWrite(() => write(owner.id));
        await refreshSources();
        return true;
      } catch {
        return false;
      }
    },
    [canMutateLibrary, refreshSources, savedSources],
  );

  const saveLyrics = useCallback(
    (item: LyricsItem, change: { origin: SourceLyricsOrigin; text: string }) =>
      writeLyrics(item, (ownerId) =>
        practiceRepository.saveSourceLyrics(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          ownerId,
          change,
        ),
      ),
    [writeLyrics],
  );

  const clearLyrics = useCallback(
    (item: LyricsItem) =>
      writeLyrics(item, (ownerId) =>
        practiceRepository.clearSourceLyrics(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          ownerId,
        ),
      ),
    [writeLyrics],
  );

  return { clearLyrics, lyricsFor, saveLyrics };
};
