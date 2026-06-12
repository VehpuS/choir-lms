import { useEffect, useMemo, useState } from 'react';
import { useGoogleDriveAuthorization } from '../auth/google-drive/use-authorization';
import { useRehearsalLibraryScreenController } from '../library/hooks/use-rehearsal-library-screen-controller';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../library/hooks/use-saved-rehearsal-library';
import { useSavedTrackPlayback } from '../library/hooks/use-saved-track-playback';
import {
  appendQueueItemsToPlaylist,
  buildSavedPlaylistFromQueue,
} from '../library/playlists/utils/queue-playlist-capture';
import { canShowQueuePlaylistActions } from '../library/playlists/utils/saved-playlist-playback-view-model';
import { getSavedTrackPlaybackActionCopy } from '../library/utils/saved-track-playback-view-model';
import { AddScreen } from '../screens/add';
import { LibraryScreen } from '../screens/library';
import { RecentsScreen } from '../screens/recents';
import {
  appendRecentRehearsalItem,
  buildRecentRehearsalItem,
  persistRecentRehearsalHistory,
  restoreRecentRehearsalHistory,
} from '../screens/recents/history';
import { MobileShell } from './shell/mobile-shell';

const PLAYBACK_SEEK_STEP_SECONDS = 15;

export const AppRouter = () => {
  const authorization = useGoogleDriveAuthorization();
  const playback = useSavedTrackPlayback(authorization.authState);
  const [recentRehearsalHistory, setRecentRehearsalHistory] = useState(
    [] as Awaited<ReturnType<typeof restoreRecentRehearsalHistory>>,
  );
  const [requestedDestinationRequestId, setRequestedDestinationRequestId] =
    useState(0);
  const [isRecentRehearsalHistoryReady, setIsRecentRehearsalHistoryReady] =
    useState(false);
  const libraryController = useRehearsalLibraryScreenController({
    authState: authorization.authState,
    googleAuthConfigured: authorization.googleAuthConfigured,
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

    return null;
  };

  const handleAppendQueueToPlaylist = async (playlistId: string) => {
    const targetPlaylist = libraryController.playlists.savedPlaylists.find(
      (playlist) => {
        return playlist.id === playlistId;
      },
    );

    if (!targetPlaylist) {
      return {
        title: 'Playlist unavailable',
        message:
          'Select a playlist that is still available in your saved Library.',
      };
    }

    const captureResult = appendQueueItemsToPlaylist({
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
          message: `The queue could not be appended to "${targetPlaylist.name}" because "${source.name}" could not be added to Library first.`,
        };
      }
    }

    const updatedPlaylist = await libraryController.playlists.updatePlaylist(
      captureResult.playlist,
    );

    if (!updatedPlaylist) {
      return {
        title: 'Could not update playlist',
        message: `The queue could not be appended to "${targetPlaylist.name}".`,
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
          activePlayableItem: activePlayableItem!,
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

  return (
    <MobileShell
      activePlayableItem={playback.activePlayableItem}
      activePlaylistSession={playback.activePlaylistSession}
      activeQueueMode={playback.activePlaylistSession?.queue.mode ?? null}
      activeRepeatMode={playback.playlistRepeatMode}
      authorization={authorization}
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
      requestedDestination="library"
      requestedDestinationRequestId={requestedDestinationRequestId}
      recentsScreen={
        <RecentsScreen
          activePlayableItemId={playback.activePlayableItem?.id ?? null}
          canQueueAsNext={playback.activePlayableItem !== null}
          isPlaybackActive={playback.playbackState === 'playing'}
          isRecentItemInLibrary={(recentRehearsal) => {
            if (recentRehearsal.playableItem.kind === 'loop') {
              if (!recentRehearsal.playableItem.loopId) {
                return false;
              }

              return savedLoopIds.has(recentRehearsal.playableItem.loopId);
            }

            return savedSourceIds.has(recentRehearsal.playableItem.sourceId);
          }}
          recentRehearsalHistory={recentRehearsalHistory}
          onQueueRecentPlaybackNext={(recentRehearsal) => {
            playback.queuePlayableItemNext(recentRehearsal.playableItem);
          }}
          onQueueRecentPlaybackUpNext={(recentRehearsal) => {
            playback.queuePlayableItemUpNext(recentRehearsal.playableItem);
          }}
          onPlayRecentShortcut={() => {
            const mostRecentItem = recentRehearsalHistory[0];

            if (!mostRecentItem) {
              return;
            }

            void playback.playPlayableItem(mostRecentItem.playableItem);
          }}
          onResumeRecentPlayback={(recentRehearsal) => {
            void playback.playPlayableItem(recentRehearsal.playableItem);
          }}
          onViewRecentInLibrary={() => {
            setRequestedDestinationRequestId((currentId) => {
              return currentId + 1;
            });
          }}
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
          libraryController={libraryController}
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
      onAppendQueueToPlaylist={handleAppendQueueToPlaylist}
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
      queuePlaylistTargets={libraryController.playlists.savedPlaylists}
      addScreen={<AddScreen libraryController={libraryController} />}
    />
  );
};
