import { aggregateRehearsalLibraryTags } from '@org/audio-library-runtime';
import { useEffect, useMemo, useState } from 'react';
import { useGoogleDriveAuthorization } from '../auth/google-drive/hooks/use-authorization';
import { useSavedTrackPlayback } from '../library/playback/hooks/use-saved-track-playback';
import { getSavedTrackPlaybackActionCopy } from '../library/playback/utils/saved-track-playback-view-model';
import { canShowQueuePlaylistActions } from '../library/playlists/utils/saved-playlist-playback-view-model';
import type { SavedRehearsalLibraryView } from '../library/saved-rehearsal-library/detail-mode';
import { useRehearsalLibraryController } from '../library/saved-rehearsal-library/use-rehearsal-library-controller';
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
import { useAppRouterQueuePlaylistActions } from './use-app-router-queue-playlist-actions';

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
  const [requestedLibraryView, setRequestedLibraryView] =
    useState<SavedRehearsalLibraryView>('files');
  const [requestedLibraryViewRequestId, setRequestedLibraryViewRequestId] =
    useState(0);
  const [requestedTag, setRequestedTag] = useState<string | null>(null);
  const [requestedTagRequestId, setRequestedTagRequestId] = useState(0);
  const [closeTagDetailRequestId, setCloseTagDetailRequestId] = useState(0);
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
  const libraryTagUsage = useMemo(() => {
    return aggregateRehearsalLibraryTags({
      entityCollections: {
        loops: libraryController.savedLibrary.savedLoops,
        playlists: libraryController.playlists.savedPlaylists,
        sources: libraryController.savedLibrary.savedLibrarySources,
      },
      folders: libraryController.savedLibrary.files.folders,
    });
  }, [
    libraryController.savedLibrary.files.folders,
    libraryController.savedLibrary.savedLibrarySources,
    libraryController.savedLibrary.savedLoops,
    libraryController.playlists.savedPlaylists,
  ]);

  const { handleSaveQueueAsPlaylist, handleUpdateQueuePlaylist } =
    useAppRouterQueuePlaylistActions({ libraryController, playback });

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

  const requestLibraryView = (view: SavedRehearsalLibraryView) => {
    setRequestedLibraryView(view);
    setRequestedLibraryViewRequestId((currentId) => {
      return currentId + 1;
    });
  };

  const requestTagDetail = (tag: string) => {
    setRequestedTag(tag);
    setRequestedTagRequestId((currentId) => {
      return currentId + 1;
    });
  };

  const closeTagDetail = () => {
    setCloseTagDetailRequestId((currentId) => {
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
          libraryTagUsage={libraryTagUsage}
          onRequestLibraryDestination={() => {
            requestDestination('library');
          }}
          onSelectTag={(tag) => {
            requestTagDetail(tag);
            requestDestination('library');
          }}
          onViewAllTags={() => {
            requestDestination('library');
            requestLibraryView('tags');
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
      libraryScreen={(isActive) => (
        <LibraryScreen
          authorization={authorization}
          closeTagDetailRequestId={closeTagDetailRequestId}
          isActive={isActive}
          libraryController={libraryController}
          onRequestAddDestination={() => {
            requestDestination('add');
          }}
          playback={playback}
          requestedTag={requestedTag}
          requestedTagRequestId={requestedTagRequestId}
          requestedView={requestedLibraryView}
          requestedViewRequestId={requestedLibraryViewRequestId}
        />
      )}
      onCloseTagDetail={closeTagDetail}
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
