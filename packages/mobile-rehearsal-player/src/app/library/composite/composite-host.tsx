import type { DriveAudioSource, PlayableItem } from '@org/audio-library-models';
import { useEffect, useMemo, useRef } from 'react';

import { ClearOfflineFilesHost } from '../../screens/offline-files/clear-offline-files-host';
import { requestClearOfflineFiles } from '../offline/clear-offline-files-request';
import { useMyPartsPreferences } from '../sheet-music/my-parts/my-parts-store';
import { CompositeCreateSheet } from './create/composite-create-sheet';
import {
  closeCompositeCreate,
  completeCompositeCreate,
  useCompositeCreateRequest,
} from './create/composite-create-request';
import type { CreateSheetTrack } from './create/create-sheet-model';
import { useSaveInOptions } from './create/use-save-in-options';
import { useTrackDurations } from './create/use-track-durations';
import { getLibraryTrack, publishLibraryTracks } from './library-tracks';
import { CompositePlaylistRequestHost } from './composite-playlist-request-host';
import { CompositeExportHost } from './export/composite-export-host';
import { CompositeStemOptionsHost } from './stem-options/composite-stem-options-host';
import { registerCompositeEngineLoader } from './playback/register-composite-engine-loader';
import { isActiveCompositeDeleted } from './playback/pause-when-deleted';
import {
  getCompositeStore,
  getCompositesSnapshot,
  useComposites,
} from './store/composite-store-instance';

type CompositeHostProps = {
  /** The playing item, and the way to stop it when its composite is deleted. */
  playback: {
    activePlayableItem: PlayableItem | null;
    pauseActivePlayback: () => Promise<unknown>;
  };
  /** Where `Add to playlist` from the playback menu writes. */
  playlists: Parameters<typeof CompositePlaylistRequestHost>[0]['playlists'];
  /** The Drive session: its token for stems, its write access for exports. */
  authorization: Parameters<typeof CompositeExportHost>[0]['authorization'];
  library: {
    savedLibrarySources: readonly DriveAudioSource[];
    saveResolvedSourceDuration: (
      sourceId: string,
      durationMs: number,
    ) => Promise<unknown>;
  };
};

/**
 * Everything the router hosts for composites: publishes the library's tracks
 * to the engine loader, registers the loader once where composites can play,
 * and shows the create sheet when `Make composite…` asks for it.
 */
export const CompositeHost = ({
  authorization,
  library,
  playback,
  playlists,
}: CompositeHostProps) => {
  const accessToken = authorization.authState.accessToken ?? null;
  const sources = library.savedLibrarySources;
  const requestedTrackIds = useCompositeCreateRequest();
  const { parts } = useMyPartsPreferences();
  const composites = useComposites();
  const previousIds = useRef<readonly string[]>([]);
  const { activePlayableItem, pauseActivePlayback } = playback;

  // A composite deleted while it plays would keep playing from a cache that is
  // gone, so playback is paused (composite-tracks 12.13).
  useEffect(() => {
    const currentIds = composites.map(({ id }) => id);

    if (
      isActiveCompositeDeleted({
        activeItem: activePlayableItem,
        currentIds,
        previousIds: previousIds.current,
      })
    ) {
      void pauseActivePlayback();
    }

    previousIds.current = currentIds;
  }, [activePlayableItem, composites, pauseActivePlayback]);

  // Published during render's commit, before any playback can start from it.
  useEffect(() => {
    publishLibraryTracks(sources);
  }, [sources]);

  useEffect(() => {
    registerCompositeEngineLoader({
      getComposite: (compositeId) =>
        getCompositesSnapshot().find(
          (composite) => composite.id === compositeId,
        ),
      getTrack: getLibraryTrack,
    });
  }, []);

  const saveIn = useSaveInOptions(requestedTrackIds);
  const requestedSources = useMemo(
    () =>
      (requestedTrackIds ?? []).flatMap((id) => {
        const source = sources.find((candidate) => candidate.id === id);

        return source ? [source] : [];
      }),
    [requestedTrackIds, sources],
  );
  // Lengths the library does not have yet are read here, so the sheet's
  // waiting state ends, and are saved for the next time.
  const learned = useTrackDurations(requestedSources, {
    accessToken,
    persistDuration: (trackId, durationMs) => {
      void library.saveResolvedSourceDuration(trackId, durationMs);
    },
  });
  const tracks = useMemo<CreateSheetTrack[]>(
    () =>
      requestedSources.map((source) => ({
        id: source.id,
        name: source.name,
        durationMs: source.durationMs ?? learned.durationsByTrackId[source.id],
      })),
    [requestedSources, learned.durationsByTrackId],
  );

  const createSheet =
    requestedTrackIds === null || tracks.length === 0 ? null : (
      <CompositeCreateSheet
        onCancel={closeCompositeCreate}
        onClearOfflineFiles={(onCleared) =>
          requestClearOfflineFiles({ onCleared })
        }
        onCreate={(draft, folderId) => {
          completeCompositeCreate();
          void getCompositeStore().create(draft, {
            folderId,
            partPreferences: parts,
          });
        }}
        saveIn={saveIn ?? undefined}
        tracks={tracks}
        unreadableTrackIds={learned.unreadableTrackIds}
      />
    );

  return (
    <>
      {createSheet}
      <CompositePlaylistRequestHost playlists={playlists} />
      <ClearOfflineFilesHost />
      <CompositeExportHost authorization={authorization} />
      <CompositeStemOptionsHost sources={sources} />
    </>
  );
};
