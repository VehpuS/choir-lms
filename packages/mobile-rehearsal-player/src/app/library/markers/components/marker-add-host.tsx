import type { NamedLoop, TrackMarker } from '@org/audio-library-models';
import { useEffect, useRef, useState } from 'react';

import { subscribeToSavedItemRequests } from '../../components/saved-item-menu/saved-item-requests';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { useSavedTrackPlayback } from '../../playback/hooks/use-saved-track-playback';
import { getPlayableItemMarkerOwnerId } from '../../playback/utils/saved-track-playback-controller/marker-jump-plan';
import type {
  MarkersItem,
  useSourceMarkers,
} from '../hooks/use-source-markers';
import { toMarkerAddResult } from '../utils/marker-add-result';
import { resolveMarkersContext } from '../utils/markers-context';
import { MarkerAddToast } from './marker-add-toast';
import { RenameMarkerDialog } from './markers-sheet/marker-dialogs';

const MS_PER_SECOND = 1000;
const TOAST_VISIBLE_MS = 5000;

type MarkerAddHostProps = {
  library: {
    markers: ReturnType<typeof useSourceMarkers>;
    savedLibrarySources: readonly DriveLibrarySource[];
    savedLoops: readonly NamedLoop[];
  };
  playback: Pick<
    ReturnType<typeof useSavedTrackPlayback>,
    'activePlayableItem' | 'progress'
  >;
};

type AddedMarker = { item: MarkersItem; marker: TrackMarker };
type Toast = { message: string; added?: AddedMarker };

/**
 * Adds a marker on request from the playback overflow (`Add marker here`, at
 * the playhead) or a waveform long-press (at the pressed position), then
 * confirms with a toast that offers `Rename`. The sheet-less path of design
 * Decision 4: the playback screen is never covered or moved.
 */
export const MarkerAddHost = ({ library, playback }: MarkerAddHostProps) => {
  const [toast, setToast] = useState<Toast | null>(null);
  const [renaming, setRenaming] = useState<AddedMarker | null>(null);
  // The subscription outlives renders, so it reads the latest data from here.
  const latest = useRef({ library, playback });

  latest.current = { library, playback };

  useEffect(() => {
    return subscribeToSavedItemRequests((request) => {
      if (request.action !== 'add-marker-here') {
        return;
      }

      const { library: lib, playback: current } = latest.current;
      const context = resolveMarkersContext(
        request,
        lib.savedLibrarySources,
        lib.savedLoops,
      );
      const owner = context ? lib.markers.markersFor(context.item).owner : null;
      const active = current.activePlayableItem;

      if (!context || !owner) {
        return;
      }

      // Without a pressed position there is only the playhead, which exists
      // only while the owner is the loaded item.
      const positionMs =
        request.positionMs ??
        (active && getPlayableItemMarkerOwnerId(active) === owner.id
          ? Math.round(current.progress.position * MS_PER_SECOND)
          : undefined);

      if (positionMs === undefined) {
        return;
      }

      void lib.markers
        .addMarker(context.item, { positionMs })
        .then(toMarkerAddResult)
        .then((result) => {
          setToast(
            'error' in result
              ? { message: result.error }
              : {
                  added: { item: context.item, marker: result.marker },
                  message: `Added ${result.marker.name}`,
                },
          );
        });
    });
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => {
      setToast(null);
    }, TOAST_VISIBLE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [toast]);

  const { added } = toast ?? {};

  return (
    <>
      {toast ? (
        <MarkerAddToast
          actionLabel={added ? 'Rename' : undefined}
          message={toast.message}
          onAction={
            added
              ? () => {
                  setToast(null);
                  setRenaming(added);
                }
              : undefined
          }
        />
      ) : null}
      {renaming ? (
        <RenameMarkerDialog
          initialName={renaming.marker.name}
          onCancel={() => {
            setRenaming(null);
          }}
          onSubmit={(name) => {
            void library.markers.renameMarker(
              renaming.item,
              renaming.marker.id,
              name,
            );
            setRenaming(null);
          }}
        />
      ) : null}
    </>
  );
};
