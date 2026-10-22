import { resolveMarkerOwner, type NamedLoop } from '@org/audio-library-models';
import { useEffect, useState } from 'react';

import {
  requestSavedItemAction,
  subscribeToSavedItemRequests,
} from '../../components/saved-item-menu/saved-item-requests';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../storage/local-library-storage';
import { requestLoopBuilder } from '../../loops/utils/loop-builder-request';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { useSavedTrackPlayback } from '../../playback/hooks/use-saved-track-playback';
import { getPlayableItemMarkerOwnerId } from '../../playback/utils/saved-track-playback-controller/marker-jump-plan';
import type { useSourceMarkers } from '../hooks/use-source-markers';
import { createSectionLoops } from '../utils/create-section-loops';
import { useMarkersFilter } from '../markers-filter-preference';
import {
  resolveMarkersContext,
  type MarkersContext,
} from '../utils/markers-context';
import {
  MARKER_ADD_FAILED_MESSAGE,
  toMarkerAddResult,
} from '../utils/marker-add-result';
import { CreateLoopsDialog } from './create-loops-dialog';
import { MarkersSheet } from './markers-sheet';
import { buildMarkersSheetModel } from './markers-sheet/model';

const MS_PER_SECOND = 1000;

type MarkersHostProps = {
  library: {
    canMutateLibrary: boolean;
    canMutateLoops: boolean;
    saveLoop: (loop: NamedLoop) => Promise<boolean>;
    markers: ReturnType<typeof useSourceMarkers>;
    savedLibrarySources: readonly DriveLibrarySource[];
    savedLoops: readonly NamedLoop[];
  };
  playback: Pick<
    ReturnType<typeof useSavedTrackPlayback>,
    'activePlayableItem' | 'jumpToMarker' | 'progress'
  >;
};

/**
 * Opens the markers list when any menu asks for it over the saved-item request
 * channel, for a track, an adjusted track, or a loop. The list always shows
 * and edits the markers of the track that owns the audio (design Decision 2).
 */
export const MarkersHost = ({ library, playback }: MarkersHostProps) => {
  const { markers, savedLibrarySources, savedLoops } = library;
  const [context, setContext] = useState<MarkersContext | null>(null);
  const [isCreatingLoops, setIsCreatingLoops] = useState(false);
  const [menuRowKey, setMenuRowKey] = useState<string | undefined>();
  const { filter, setFilter } = useMarkersFilter();

  useEffect(() => {
    return subscribeToSavedItemRequests((request) => {
      if (request.action !== 'markers') {
        return;
      }

      setMenuRowKey(request.markerKey);
      setContext(
        resolveMarkersContext(request, savedLibrarySources, savedLoops),
      );
    });
  }, [savedLibrarySources, savedLoops]);

  const resolution = context ? markers.markersFor(context.item) : null;

  if (!context || !resolution?.owner) {
    return null;
  }

  const { owner } = resolution;
  const { item } = context;
  const active = playback.activePlayableItem;
  const isOwnerLoaded =
    active !== null && getPlayableItemMarkerOwnerId(active) === owner.id;
  const currentPositionMs = isOwnerLoaded
    ? Math.round(playback.progress.position * MS_PER_SECOND)
    : undefined;
  const model = buildMarkersSheetModel({
    canMakeLoops: library.canMutateLoops,
    canMutateLibrary: library.canMutateLibrary,
    derived: resolution.derived,
    durationMs: owner.durationMs,
    explicit: resolution.explicit,
    filter,
    isOwnerLoaded,
    ownerName: owner.name,
    range: context.range,
  });

  // Loops of this track, including its adjusted copies', so a section that
  // already exists as a loop is shown and skipped.
  const ownerLoops = savedLoops
    .filter(
      (loop) =>
        resolveMarkerOwner(
          { id: loop.id, sourceId: loop.sourceId },
          savedLibrarySources,
        )?.id === owner.id,
    )
    .map(({ endMs, name, startMs }) => ({ endMs, name, startMs }));

  return (
    <>
      <MarkersSheet
        currentPositionMs={currentPositionMs}
        durationMs={owner.durationMs}
        filter={filter}
        initialMenuRowKey={menuRowKey}
        model={model}
        onAddHere={async () => {
          if (currentPositionMs === undefined) {
            return { error: MARKER_ADD_FAILED_MESSAGE };
          }

          return toMarkerAddResult(
            await markers.addMarker(item, { positionMs: currentPositionMs }),
          );
        }}
        onClose={() => {
          setContext(null);
        }}
        onCreateLoops={() => {
          setIsCreatingLoops(true);
        }}
        onDelete={async (markerId) => {
          return (await markers.deleteMarker(item, markerId)).marker;
        }}
        onFilterChange={setFilter}
        onJump={(row) => {
          void playback.jumpToMarker(context.target, row.positionMs);
        }}
        onKeepAsMarker={(row) => {
          void markers.addMarker(item, {
            name: row.name,
            positionMs: row.positionMs,
          });
        }}
        onMakeLoop={(draft) => {
          // The loop editor opens on the item's own source, prefilled.
          setContext(null);
          requestLoopBuilder({
            endMs: draft.endMs,
            name: draft.name,
            sourceId: context.target.sourceId,
            startMs: draft.startMs,
          });
        }}
        onMove={(markerId, positionMs) => {
          void markers.moveMarker(item, markerId, positionMs);
        }}
        onOpenLoop={(loopId) => {
          setContext(null);
          requestSavedItemAction({
            action: 'edit-loop',
            id: loopId,
            kind: 'loop',
          });
        }}
        onRename={(markerId, name) => {
          void markers.renameMarker(item, markerId, name);
        }}
        onRestore={(marker) => {
          void markers.restoreMarker(item, marker);
        }}
      />
      {isCreatingLoops ? (
        <CreateLoopsDialog
          durationMs={owner.durationMs}
          existingLoops={ownerLoops}
          explicitMarkers={resolution.explicit}
          onCancel={() => {
            setIsCreatingLoops(false);
          }}
          onCreate={async (sections) => {
            const didSaveAll = await createSectionLoops({
              ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
              saveLoop: library.saveLoop,
              sections,
              source: context.target.source,
            });

            if (didSaveAll) {
              setIsCreatingLoops(false);
              setContext(null);
            }

            return didSaveAll;
          }}
        />
      ) : null}
    </>
  );
};
