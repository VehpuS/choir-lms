import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';
import { useEffect, useReducer, useState } from 'react';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { createPlaylistAddSuccessFeedback } from './library-files-success-feedback';
import type { LibraryFilesSuccessFeedback } from './library-files-success-feedback';
import {
  buildSavedPlaylist,
  type PlaylistDraftIssue,
} from '../../playlists/utils/saved-playlist-view-model';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../storage/local-library-storage';
import {
  getSavedTrackPlaylistMenuInitialState,
  reduceSavedTrackPlaylistMenuState,
} from '../../playlists/utils/saved-track-playlist-menu-view-model';

type UseSavedRehearsalLibraryTrackPlaylistMenuOptions = {
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  onShowSuccessFeedback?: (feedback: LibraryFilesSuccessFeedback) => void;
  savedLibrarySources: DriveLibrarySource[];
  savedLoops: NamedLoop[];
  setSelectedPlaylistId: (playlistId: string) => void;
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
};

export const useSavedRehearsalLibraryTrackPlaylistMenu = ({
  createPlaylist,
  onShowSuccessFeedback,
  savedLibrarySources,
  savedLoops,
  setSelectedPlaylistId,
  updatePlaylist,
}: UseSavedRehearsalLibraryTrackPlaylistMenuOptions) => {
  const [trackPlaylistCreationIssue, setTrackPlaylistCreationIssue] =
    useState<PlaylistDraftIssue | null>(null);
  const [trackPlaylistMenuState, dispatchTrackPlaylistMenu] = useReducer(
    reduceSavedTrackPlaylistMenuState,
    undefined,
    getSavedTrackPlaylistMenuInitialState,
  );

  const selectedTrackMenuSource =
    savedLibrarySources.find((source) => {
      return source.id === trackPlaylistMenuState.selectedSourceId;
    }) ?? null;
  const selectedTrackMenuLoop =
    savedLoops.find((loop) => {
      return loop.id === trackPlaylistMenuState.selectedLoopId;
    }) ?? null;

  useEffect(() => {
    if (trackPlaylistMenuState.selectedSourceId && !selectedTrackMenuSource) {
      dispatchTrackPlaylistMenu({ type: 'close' });
      setTrackPlaylistCreationIssue(null);
      return;
    }

    if (trackPlaylistMenuState.selectedLoopId && !selectedTrackMenuLoop) {
      dispatchTrackPlaylistMenu({ type: 'close' });
      setTrackPlaylistCreationIssue(null);
    }
  }, [
    selectedTrackMenuLoop,
    selectedTrackMenuSource,
    trackPlaylistMenuState.selectedLoopId,
    trackPlaylistMenuState.selectedSourceId,
  ]);

  const closeTrackPlaylistMenu = () => {
    dispatchTrackPlaylistMenu({ type: 'close' });
    setTrackPlaylistCreationIssue(null);
  };

  const persistPlaylist = async (
    playlist: Playlist,
    buildNextPlaylist: (playlist: Playlist) => Playlist,
  ) => {
    const persistedPlaylist = await updatePlaylist(buildNextPlaylist(playlist));

    if (persistedPlaylist) {
      setSelectedPlaylistId(persistedPlaylist.id);
    }

    return persistedPlaylist;
  };

  const handleSelectPlaylistForAddTarget = async (playlist: Playlist) => {
    if (selectedTrackMenuSource) {
      const persistedPlaylist = await persistPlaylist(
        playlist,
        (nextPlaylist) => {
          return addTrackToPlaylist(nextPlaylist, selectedTrackMenuSource);
        },
      );

      if (persistedPlaylist) {
        onShowSuccessFeedback?.(
          createPlaylistAddSuccessFeedback({
            isNewPlaylist: false,
            itemLabel: selectedTrackMenuSource.name,
            playlistName: persistedPlaylist.name,
          }),
        );
        closeTrackPlaylistMenu();
      }

      return;
    }

    if (!selectedTrackMenuLoop) {
      return;
    }

    const persistedPlaylist = await persistPlaylist(
      playlist,
      (nextPlaylist) => {
        return addLoopToPlaylist(nextPlaylist, selectedTrackMenuLoop);
      },
    );

    if (persistedPlaylist) {
      onShowSuccessFeedback?.(
        createPlaylistAddSuccessFeedback({
          isNewPlaylist: false,
          itemLabel: selectedTrackMenuLoop.name,
          playlistName: persistedPlaylist.name,
        }),
      );
      closeTrackPlaylistMenu();
    }
  };

  return {
    closeTrackPlaylistMenu,
    menuSurfaceProps: {
      createPlaylistIssue: trackPlaylistCreationIssue,
      draftName: trackPlaylistMenuState.draftName,
      onClose: closeTrackPlaylistMenu,
      onDraftNameChange(value: string) {
        setTrackPlaylistCreationIssue(null);
        dispatchTrackPlaylistMenu({
          type: 'update-draft',
          value,
        });
      },
      onSelectPlaylist(playlist: Playlist) {
        void handleSelectPlaylistForAddTarget(playlist);
      },
      onShowCreatePlaylist() {
        setTrackPlaylistCreationIssue(null);
        dispatchTrackPlaylistMenu({ type: 'open-create' });
      },
      onShowPlaylistSelector() {
        setTrackPlaylistCreationIssue(null);
        dispatchTrackPlaylistMenu(
          trackPlaylistMenuState.step === 'create'
            ? { type: 'cancel-create' }
            : { type: 'open-selector' },
        );
      },
      onSubmitNewPlaylist() {
        void (async () => {
          if (!selectedTrackMenuSource && !selectedTrackMenuLoop) {
            return;
          }

          const result = buildSavedPlaylist({
            name: trackPlaylistMenuState.draftName,
            ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          });

          if (result.issue || !result.playlist) {
            setTrackPlaylistCreationIssue(result.issue);
            return;
          }

          const playlistWithTarget = selectedTrackMenuSource
            ? addTrackToPlaylist(result.playlist, selectedTrackMenuSource)
            : selectedTrackMenuLoop
              ? addLoopToPlaylist(result.playlist, selectedTrackMenuLoop)
              : null;

          if (!playlistWithTarget) {
            return;
          }

          const createdPlaylist = await createPlaylist(playlistWithTarget);

          if (!createdPlaylist) {
            return;
          }

          setSelectedPlaylistId(createdPlaylist.id);
          onShowSuccessFeedback?.(
            createPlaylistAddSuccessFeedback({
              isNewPlaylist: true,
              itemLabel:
                (selectedTrackMenuSource ?? selectedTrackMenuLoop)?.name ??
                'Item',
              playlistName: createdPlaylist.name,
            }),
          );
          closeTrackPlaylistMenu();
        })();
      },
      selectedLoop: selectedTrackMenuLoop,
      selectedSource: selectedTrackMenuSource,
      step: trackPlaylistMenuState.step,
    },
    openLoopPlaylistSelector(loopId: string) {
      setTrackPlaylistCreationIssue(null);
      dispatchTrackPlaylistMenu({
        type: 'open-loop-selector',
        loopId,
      });
    },
    openSourcePlaylistSelector(sourceId: string) {
      setTrackPlaylistCreationIssue(null);
      dispatchTrackPlaylistMenu({
        type: 'open',
        sourceId,
      });
    },
  };
};
