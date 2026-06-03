import { useEffect, useMemo, useState } from 'react';
import { useGoogleDriveAuthorization } from '../auth/hooks/use-google-drive-authorization';
import { useRehearsalLibraryScreenController } from '../library/hooks/use-rehearsal-library-screen-controller';
import { useSavedTrackPlayback } from '../library/hooks/use-saved-track-playback';
import { getSavedTrackPlaybackActionCopy } from '../library/utils/saved-track-playback-view-model';
import { AddScreen } from '../screens/AddScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { RecentsScreen } from '../screens/RecentsScreen';
import {
  appendRecentRehearsalItem,
  buildRecentRehearsalItem,
  persistRecentRehearsalHistory,
  restoreRecentRehearsalHistory,
} from '../screens/recents-history';
import { MobileShell } from './MobileShell';

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
      addScreen={<AddScreen libraryController={libraryController} />}
    />
  );
};
