import { useEffect, useMemo, useState } from 'react';
import { useGoogleDriveAuthorization } from '../auth/google-drive/hooks/use-authorization';
import { useSavedTrackPlayback } from '../library/playback/hooks/use-saved-track-playback';
import { getSavedTrackPlaybackActionCopy } from '../library/playback/utils/saved-track-playback-view-model';
import {
  buildSavedPlaylistFromQueue,
  replaceQueueItemsInPlaylist,
} from '../library/playlists/utils/queue-playlist-capture';
import {
  canShowQueuePlaylistActions,
  canUpdateQueuePlaylist,
} from '../library/playlists/utils/saved-playlist-playback-view-model';
import { useRehearsalLibraryController } from '../library/saved-rehearsal-library/use-rehearsal-library-controller';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../library/storage/local-library-storage';
import { AddScreen } from '../screens/add';
import { LibraryScreen } from '../screens/library';
import { AppRouterRecentsScreen } from '../screens/recents/app-router-recents-screen';
import {
  appendRecentRehearsalItem,
  buildRecentRehearsalItem,
  persistRecentRehearsalHistory,
  restoreRecentRehearsalHistory,
} from '../screens/recents/history';
import { MobileShell } from './shell/mobile-shell';
import type { ShellDestinationKey } from './shell/shell-model';

const PLAYBACK_SEEK_STEP_SECONDS = 15;

export const AppRouter = () => {
  const authorization = useGoogleDriveAuthorization();
  const playback = useSavedTrackPlayback(
    authorization.authState,
    authorization.expireAuthorization,
    authorization.startAuthorization,
  );
  const [recentRehearsalHistory, setRecentRehearsalHistory] = useState(
    [] as Awaited<ReturnType<typeof restoreRecentRehearsalHistory>>,
  );
  const [requestedDestination, setRequestedDestination] =
    useState<ShellDestinationKey>('library');
  const [requestedDestinationRequestId, setRequestedDestinationRequestId] =
    useState(0);
  const [isRecentRehearsalHistoryReady, setIsRecentRehearsalHistoryReady] =
    useState(false);
  const libraryController = useRehearsalLibraryController({
    authState: authorization.authState,
    googleAuthConfigured: authorization.googleAuthConfigured,
    onAuthorizationExpired: authorization.expireAuthorization,
    onAuthorizationRequired: authorization.startAuthorization,
    playback,
  });
  const playbackActionCopy = playback.activePlayableItem
    ? getSavedTrackPlaybackActionCopy({
        activePlayableItem: playback.activePlayableItem,
        isPreparing: playback.isPreparing,
        playableItem: playback.activePlayableItem,
        playbackState: playback.playbackState,
      })
    : null;
  const savedSourceIds = useMemo(() => {
    return new Set(
      libraryController.savedLibrary.savedLibrarySources.map((source) => {
        return source.id;
      }),
    );
  }, [libraryController.savedLibrary.savedLibrarySources]);
  const savedLoopIds = useMemo(() => {
    return new Set(
      libraryController.savedLibrary.savedLoops.map((loop) => {
        return loop.id;
      }),
    );
  }, [libraryController.savedLibrary.savedLoops]);

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

  useEffect(() => {
    let isDisposed = false;

    const hydrateRecentRehearsalHistory = async () => {
      const restoredHistory = await restoreRecentRehearsalHistory();

      if (isDisposed) {
        return;
      }

      setRecentRehearsalHistory(restoredHistory);
      setIsRecentRehearsalHistoryReady(true);
    };

    void hydrateRecentRehearsalHistory();

    return () => {
      isDisposed = true;
    };
  }, []);

  useEffect(() => {
    const activePlayableItem = playback.activePlayableItem;

    if (!isRecentRehearsalHistoryReady || !activePlayableItem) {
      return;
    }

    setRecentRehearsalHistory((currentHistory) => {
      const nextHistory = appendRecentRehearsalItem(
        currentHistory,
        buildRecentRehearsalItem({
          activePlayableItem,
          activePlaylistSession: playback.activePlaylistSession,
          playedAt: new Date().toISOString(),
        }),
      );

      void persistRecentRehearsalHistory(nextHistory);

      return nextHistory;
    });
  }, [
    isRecentRehearsalHistoryReady,
    playback.activePlayableItem,
    playback.activePlaylistSession,
  ]);

  const requestDestination = (destination: ShellDestinationKey) => {
    setRequestedDestination(destination);
    setRequestedDestinationRequestId((currentId) => {
      return currentId + 1;
    });
  };

  return (
    <MobileShell
      activePlayableItem={playback.activePlayableItem}
      activePlaylistSession={playback.activePlaylistSession}
      activeQueueMode={playback.activePlaylistSession?.queue.mode ?? null}
      activeRepeatMode={playback.playlistRepeatMode}
      canShowQueuePlaylistActions={canShowQueuePlaylistActions(
        playback.activePlaylistSession,
      )}
      canSeekActivePlayback={
        playback.activePlayableItem !== null && !playback.isPreparing
      }
      canSkipNextItem={
        playback.activePlaylistSession !== null && !playback.isPreparing
      }
      canSkipPreviousItem={
        playback.activePlaylistSession !== null && !playback.isPreparing
      }
      requestedDestination={requestedDestination}
      requestedDestinationRequestId={requestedDestinationRequestId}
      recentsScreen={
        <AppRouterRecentsScreen
          authorization={authorization}
          onRequestLibraryDestination={() => {
            requestDestination('library');
          }}
          playback={playback}
          recentRehearsalHistory={recentRehearsalHistory}
          savedLoopIds={savedLoopIds}
          savedSourceIds={savedSourceIds}
          savedTrackCount={libraryController.savedLibrary.trackCount}
        />
      }
      isPlaybackPreparing={playback.isPreparing}
      isSavingQueueAsPlaylist={
        libraryController.savedLibrary.pendingSourceId !== null ||
        libraryController.playlists.pendingPlaylistId !== null
      }
      isPlaybackToggleDisabled={playbackActionCopy?.disabled ?? true}
      libraryScreen={
        <LibraryScreen
          authorization={authorization}
          libraryController={libraryController}
          onRequestAddDestination={() => {
            requestDestination('add');
          }}
          playback={playback}
        />
      }
      onSeekBackward={() => {
        void playback.seekActivePlaybackBySeconds(-PLAYBACK_SEEK_STEP_SECONDS);
      }}
      onSeekForward={() => {
        void playback.seekActivePlaybackBySeconds(PLAYBACK_SEEK_STEP_SECONDS);
      }}
      onSeekToPosition={(positionSeconds) => {
        void playback.seekActivePlaybackToPosition(positionSeconds);
      }}
      onMoveQueueItem={(fromIndex, toIndex) => {
        playback.moveQueueItem(fromIndex, toIndex);
      }}
      onMoveQueueItemToEnd={(index) => {
        playback.moveQueueItemToEnd(index);
      }}
      onMoveQueueItemToStart={(index) => {
        playback.moveQueueItemToStart(index);
      }}
      onPlayQueueItem={(index) => {
        void playback.playQueueItem(index);
      }}
      onRemoveQueueItem={(index) => {
        playback.removeQueueItem(index);
      }}
      onSaveQueueAsPlaylist={handleSaveQueueAsPlaylist}
      onUpdateQueuePlaylist={handleUpdateQueuePlaylist}
      onSelectQueueMode={(mode) => {
        playback.setPlaylistQueueMode(mode);
      }}
      onSelectRepeatMode={(mode) => {
        playback.setPlaylistRepeatMode(mode);
      }}
      onSetPlaybackVolume={(volumeLevel) => {
        void playback.setPlaybackVolume(volumeLevel);
      }}
      onSkipNextItem={() => {
        void playback.skipToNextItem();
      }}
      onSkipPreviousItem={() => {
        void playback.skipToPreviousItem();
      }}
      onTogglePlayback={() => {
        void playback.toggleActivePlayback();
      }}
      playbackPositionSeconds={playback.progress.position}
      playbackToggleLabel={playbackActionCopy?.label ?? 'Play'}
      playbackVolumeLevel={playback.volumeLevel}
      playbackState={playback.playbackState}
      savedLibraryConfirmationDialog={libraryController.confirmationDialog}
      addScreen={
        <AddScreen
          authorization={authorization}
          libraryController={libraryController}
        />
      }
    />
  );
};
