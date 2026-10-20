import {
  deriveLoopMarkers,
  resolveMarkerOwner,
  type DerivedLoopMarker,
  type NamedLoop,
  type TrackMarker,
} from '@org/audio-library-models';
import type {
  MarkerAddition,
  MarkerWriteStatus,
} from '@org/audio-library-runtime';
import { useCallback } from 'react';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { LyricsItem } from '../../lyrics/hooks/use-source-lyrics';
import {
  enqueueLibraryWrite,
  practiceRepository,
} from '../../saved-rehearsal-library/use-saved-rehearsal-library';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../storage/local-library-storage';

/** A track, adjusted track, or loop: anything whose markers resolve to a track. */
export type MarkersItem = LyricsItem;

export type SourceMarkersResolution = {
  /** The saved track that owns the markers, or null when it no longer exists. */
  owner: DriveLibrarySource | null;
  explicit: readonly TrackMarker[];
  /** Read-only markers from the owner's loops, including its adjusted copies'. */
  derived: readonly DerivedLoopMarker[];
};

export type MarkerActionResult = {
  /** `unavailable` means no write happened: no owner, or the library is read-only. */
  status: MarkerWriteStatus | 'unavailable';
  marker?: TrackMarker;
};

type ResolveOptions = {
  /** The loop being edited contributes no derived markers. */
  excludeLoopId?: string;
};

const NO_MARKERS: readonly TrackMarker[] = [];
const NO_DERIVED: readonly DerivedLoopMarker[] = [];
const UNAVAILABLE: MarkerActionResult = { status: 'unavailable' };

export const resolveSourceMarkers = (
  item: MarkersItem,
  savedSources: readonly DriveLibrarySource[],
  savedLoops: readonly NamedLoop[],
  options: ResolveOptions = {},
): SourceMarkersResolution => {
  const owner = resolveMarkerOwner(item, savedSources);

  if (!owner) {
    return { owner, explicit: NO_MARKERS, derived: NO_DERIVED };
  }

  return {
    owner,
    explicit: owner.markers ?? NO_MARKERS,
    derived: deriveLoopMarkers(owner.id, savedLoops, savedSources, options),
  };
};

type UseSourceMarkersOptions = {
  canMutateLibrary: boolean;
  refreshSources: () => Promise<void>;
  savedLoops: readonly NamedLoop[];
  savedSources: readonly DriveLibrarySource[];
};

export const useSourceMarkers = ({
  canMutateLibrary,
  refreshSources,
  savedLoops,
  savedSources,
}: UseSourceMarkersOptions) => {
  const markersFor = useCallback(
    (item: MarkersItem, options?: ResolveOptions) =>
      resolveSourceMarkers(item, savedSources, savedLoops, options),
    [savedLoops, savedSources],
  );

  // Edits always land on the owning track, so a loop or adjusted track being
  // played edits its parent's markers (design Decision 2).
  const writeMarkers = useCallback(
    async (
      item: MarkersItem,
      write: (
        ownerId: string,
      ) => Promise<{ status: MarkerWriteStatus; marker?: TrackMarker }>,
    ): Promise<MarkerActionResult> => {
      const owner = resolveMarkerOwner(item, savedSources);

      if (!canMutateLibrary || !owner) {
        return UNAVAILABLE;
      }

      try {
        const result = await enqueueLibraryWrite(() => write(owner.id));

        await refreshSources();

        return { status: result.status, marker: result.marker };
      } catch {
        return UNAVAILABLE;
      }
    },
    [canMutateLibrary, refreshSources, savedSources],
  );

  const addMarker = useCallback(
    (item: MarkersItem, addition: MarkerAddition) =>
      writeMarkers(item, (ownerId) =>
        practiceRepository.addMarker(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          ownerId,
          addition,
        ),
      ),
    [writeMarkers],
  );

  const renameMarker = useCallback(
    (item: MarkersItem, markerId: string, name: string) =>
      writeMarkers(item, (ownerId) =>
        practiceRepository.renameMarker(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          ownerId,
          markerId,
          name,
        ),
      ),
    [writeMarkers],
  );

  const moveMarker = useCallback(
    (item: MarkersItem, markerId: string, positionMs: number) =>
      writeMarkers(item, (ownerId) =>
        practiceRepository.moveMarker(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          ownerId,
          markerId,
          positionMs,
        ),
      ),
    [writeMarkers],
  );

  // The result carries the removed marker so the caller can offer undo with
  // `restoreMarker`.
  const deleteMarker = useCallback(
    (item: MarkersItem, markerId: string) =>
      writeMarkers(item, (ownerId) =>
        practiceRepository.deleteMarker(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          ownerId,
          markerId,
        ),
      ),
    [writeMarkers],
  );

  const restoreMarker = useCallback(
    (item: MarkersItem, marker: TrackMarker) =>
      addMarker(item, {
        id: marker.id,
        name: marker.name,
        positionMs: marker.positionMs,
        createdAt: marker.createdAt,
      }),
    [addMarker],
  );

  return {
    addMarker,
    deleteMarker,
    markersFor,
    moveMarker,
    renameMarker,
    restoreMarker,
  };
};
