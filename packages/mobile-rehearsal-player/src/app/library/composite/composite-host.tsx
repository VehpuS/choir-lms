import type { DriveAudioSource } from '@org/audio-library-models';
import { useEffect, useMemo } from 'react';

import { useMyPartsPreferences } from '../sheet-music/my-parts/my-parts-store';
import { CompositeCreateSheet } from './create/composite-create-sheet';
import {
  closeCompositeCreate,
  useCompositeCreateRequest,
} from './create/composite-create-request';
import type { CreateSheetTrack } from './create/create-sheet-model';
import { getLibraryTrack, publishLibraryTracks } from './library-tracks';
import { registerCompositeEngineLoader } from './playback/register-composite-engine-loader';
import {
  getCompositeStore,
  getCompositesSnapshot,
} from './store/composite-store-instance';

type CompositeHostProps = {
  library: { savedLibrarySources: readonly DriveAudioSource[] };
};

/**
 * Everything the router hosts for composites: publishes the library's tracks
 * to the engine loader, registers the loader once where composites can play,
 * and shows the create sheet when `Make composite…` asks for it.
 */
export const CompositeHost = ({ library }: CompositeHostProps) => {
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

  const tracks = useMemo<CreateSheetTrack[]>(
    () =>
      (requestedTrackIds ?? []).flatMap((id) => {
        const source = sources.find((candidate) => candidate.id === id);

        return source
          ? [{ id, name: source.name, durationMs: source.durationMs }]
          : [];
      }),
    [requestedTrackIds, sources],
  );

  if (requestedTrackIds === null || tracks.length === 0) {
    return null;
  }

  return (
    <CompositeCreateSheet
      onCancel={closeCompositeCreate}
      onCreate={(draft) => {
        closeCompositeCreate();
        void getCompositeStore().create(draft, { partPreferences: parts });
      }}
      tracks={tracks}
    />
  );
};
