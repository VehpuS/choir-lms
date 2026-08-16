import type { useSavedTrackPlayback } from '../library/playback/hooks/use-saved-track-playback';
import {
  buildSavedPlaylistFromQueue,
  replaceQueueItemsInPlaylist,
} from '../library/playlists/utils/queue-playlist-capture';
import { canUpdateQueuePlaylist } from '../library/playlists/utils/saved-playlist-playback-view-model';
import type { useRehearsalLibraryController } from '../library/saved-rehearsal-library/use-rehearsal-library-controller';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../library/storage/local-library-storage';

export const useAppRouterQueuePlaylistActions = (options: {
  libraryController: ReturnType<typeof useRehearsalLibraryController>;
  playback: ReturnType<typeof useSavedTrackPlayback>;
}) => {
  const { libraryController, playback } = options;

  const handleSaveQueueAsPlaylist = async (name: string) => {
    const captureResult = buildSavedPlaylistFromQueue({
      name,
      ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
      savedLoops: libraryController.savedLibrary.savedLoops,
      savedSources: libraryController.savedLibrary.savedLibrarySources,
      session: playback.activePlaylistSession,
    });

    if (captureResult.issue || !captureResult.playlist) {
      return captureResult.issue;
    }

    for (const source of captureResult.unsavedSources) {
      const didSave = await libraryController.savedLibrary.saveSource(source);

      if (!didSave) {
        return {
          title: 'Could not save queued track',
          message: `The queue could not be saved as a playlist because "${source.name}" could not be added to Library first.`,
        };
      }
    }

    const createdPlaylist = await libraryController.playlists.createPlaylist(
      captureResult.playlist,
    );

    if (!createdPlaylist) {
      return {
        title: 'Could not save playlist',
        message: `The queue could not be saved as the playlist "${captureResult.playlist.name}".`,
      };
    }

    playback.bindActiveQueueToPlaylist({
      loops: libraryController.savedLibrary.savedLoops,
      playlist: createdPlaylist,
      sources: libraryController.savedLibrary.savedLibrarySources,
    });

    return null;
  };

  const handleUpdateQueuePlaylist = async () => {
    if (!canUpdateQueuePlaylist(playback.activePlaylistSession)) {
      return {
        title: 'Playlist unavailable',
        message:
          'Start playback from a saved playlist before updating it from Up Next.',
      };
    }

    const targetPlaylist = libraryController.playlists.savedPlaylists.find(
      (playlist) => {
        return playlist.id === playback.activePlaylistSession?.playlistId;
      },
    );

    if (!targetPlaylist) {
      return {
        title: 'Playlist unavailable',
        message:
          'The playlist for this active queue is no longer available in your saved Library.',
      };
    }

    const captureResult = replaceQueueItemsInPlaylist({
      playlist: targetPlaylist,
      savedLoops: libraryController.savedLibrary.savedLoops,
      savedSources: libraryController.savedLibrary.savedLibrarySources,
      session: playback.activePlaylistSession,
    });

    if (captureResult.issue || !captureResult.playlist) {
      return captureResult.issue;
    }

    for (const source of captureResult.unsavedSources) {
      const didSave = await libraryController.savedLibrary.saveSource(source);

      if (!didSave) {
        return {
          title: 'Could not save queued track',
          message: `The queue could not update "${targetPlaylist.name}" because "${source.name}" could not be added to Library first.`,
        };
      }
    }

    const updatedPlaylist = await libraryController.playlists.updatePlaylist(
      captureResult.playlist,
    );

    if (!updatedPlaylist) {
      return {
        title: 'Could not update playlist',
        message: `The current Up Next order could not replace "${targetPlaylist.name}".`,
      };
    }

    return null;
  };

  return { handleSaveQueueAsPlaylist, handleUpdateQueuePlaylist };
};
