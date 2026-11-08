import type { DriveAudioSource } from '@org/audio-library-models';
import { useEffect, useMemo } from 'react';

import { useMyPartsPreferences } from '../sheet-music/my-parts/my-parts-store';
import { CompositeCreateSheet } from './create/composite-create-sheet';
import {
  closeCompositeCreate,
  useCompositeCreateRequest,
} from './create/composite-create-request';
import type { CreateSheetTrack } from './create/create-sheet-model';
import { useTrackDurations } from './create/use-track-durations';
import { getLibraryTrack, publishLibraryTracks } from './library-tracks';
import { CompositeStemOptionsHost } from './stem-options/composite-stem-options-host';
import { registerCompositeEngineLoader } from './playback/register-composite-engine-loader';
import {
  getCompositeStore,
  getCompositesSnapshot,
} from './store/composite-store-instance';

type CompositeHostProps = {
  /** The Drive token, or null with no session. */
  accessToken: string | null;
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
export const CompositeHost = ({ accessToken, library }: CompositeHostProps) => {
  const sources = library.savedLibrarySources;
  const requestedTrackIds = useCompositeCreateRequest();
  const { parts } = useMyPartsPreferences();

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
        onCreate={(draft) => {
          closeCompositeCreate();
          void getCompositeStore().create(draft, { partPreferences: parts });
        }}
        tracks={tracks}
        unreadableTrackIds={learned.unreadableTrackIds}
      />
    );

  return (
    <>
      {createSheet}
      <CompositeStemOptionsHost sources={sources} />
    </>
  );
};
