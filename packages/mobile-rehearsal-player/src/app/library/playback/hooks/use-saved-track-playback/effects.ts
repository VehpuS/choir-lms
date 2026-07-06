import type { PlayableItem, RepeatMode } from '@org/audio-library-models';
import {
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import type { PlaylistPlaybackSession } from '../../../playlists/utils/saved-playlist-playback-view-model';
import type { SavedTrackPlaybackController } from '../../utils/saved-track-playback-controller';
import type { SavedTrackPlaybackControllerOptions } from '../../utils/saved-track-playback-controller/shared';
import { registerSavedTrackPlaybackRemoteCommandHandlers } from '../../utils/saved-track-playback-remote-controls';
import {
  createSavedTrackPlaybackRuntimeIssue,
  hasSavedTrackPlaybackReachedRangeEnd,
  hydratePlayableItemDuration,
  normalizePlaybackVolumeLevel,
  shouldRepeatSingleItemPlayback,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../../utils/saved-track-playback-view-model';
import {
  getSavedTrackPlayer,
  useSavedTrackPlayerEvents,
} from '../../utils/saved-track-player-interop';
import {
  ensureSavedTrackPlayerReady,
  syncSavedTrackPlayerCapabilities,
} from '../../utils/saved-track-player-runtime';
import {
  DEFAULT_PLAYBACK_VOLUME_LEVEL,
  trackPlayerEvent,
  trackPlayerState,
} from './shared';

type UseSavedTrackPlaybackEffectsOptions = {
  activePlayableItem: PlayableItem | null;
  activePlayableItemRef: MutableRefObject<PlayableItem | null>;
  activePlaylistSession: PlaylistPlaybackSession | null;
  activePlaylistSessionRef: MutableRefObject<PlaylistPlaybackSession | null>;
  playbackController: SavedTrackPlaybackController;
  playbackState: SavedTrackPlaybackState | undefined;
  playbackStateRef: MutableRefObject<SavedTrackPlaybackControllerOptions>;
  playlistRepeatMode: RepeatMode;
  progressDurationSeconds: number;
  progressPositionSeconds: number;
  repeatModeRef: MutableRefObject<RepeatMode>;
  setActivePlayableItem: Dispatch<SetStateAction<PlayableItem | null>>;
  setIsPreparing: Dispatch<SetStateAction<boolean>>;
  setIssue: Dispatch<SetStateAction<SavedTrackPlaybackIssue | null>>;
  setVolumeLevel: Dispatch<SetStateAction<number>>;
  volumeLevel: number;
  volumeLevelRef: MutableRefObject<number>;
};

export const useSavedTrackPlaybackEffects = ({
  activePlayableItem,
  activePlayableItemRef,
  activePlaylistSession,
  activePlaylistSessionRef,
  playbackController,
  playbackState,
  playbackStateRef,
  playlistRepeatMode,
  progressDurationSeconds,
  progressPositionSeconds,
  repeatModeRef,
  setActivePlayableItem,
  setIsPreparing,
  setIssue,
  setVolumeLevel,
  volumeLevel,
  volumeLevelRef,
}: UseSavedTrackPlaybackEffectsOptions) => {
  useEffect(() => {
    activePlayableItemRef.current = activePlayableItem;
  }, [activePlayableItem, activePlayableItemRef]);

  useEffect(() => {
    activePlaylistSessionRef.current = activePlaylistSession;
  }, [activePlaylistSession, activePlaylistSessionRef]);

  useEffect(() => {
    volumeLevelRef.current = volumeLevel;
  }, [volumeLevel, volumeLevelRef]);

  useEffect(() => {
    repeatModeRef.current = playlistRepeatMode;
  }, [playlistRepeatMode, repeatModeRef]);

  useEffect(() => {
    playbackStateRef.current.playbackState = playbackState;
  }, [playbackState, playbackStateRef]);

  useEffect(() => {
    if (!activePlayableItem) {
      return;
    }

    let isDisposed = false;

    const syncPlaybackVolumeLevel = async () => {
      try {
        await ensureSavedTrackPlayerReady();
        const trackPlayer = getSavedTrackPlayer();

        const currentVolumeLevel = normalizePlaybackVolumeLevel(
          await trackPlayer.getVolume(),
        );

        if (isDisposed) {
          return;
        }

        volumeLevelRef.current = currentVolumeLevel;
        setVolumeLevel(currentVolumeLevel);
      } catch {
        if (isDisposed) {
          return;
        }

        volumeLevelRef.current = DEFAULT_PLAYBACK_VOLUME_LEVEL;
        setVolumeLevel(DEFAULT_PLAYBACK_VOLUME_LEVEL);
      }
    };

    void syncPlaybackVolumeLevel();

    return () => {
      isDisposed = true;
    };
  }, [
    activePlayableItem?.id,
    activePlayableItem?.playlistEntryId,
    setVolumeLevel,
    volumeLevelRef,
  ]);

  useEffect(() => {
    if (!activePlayableItem || progressDurationSeconds <= 0) {
      return;
    }

    setActivePlayableItem((currentPlayableItem) => {
      if (
        !currentPlayableItem ||
        currentPlayableItem.id !== activePlayableItem.id
      ) {
        return currentPlayableItem;
      }

      return hydratePlayableItemDuration({
        durationSeconds: progressDurationSeconds,
        playableItem: currentPlayableItem,
      });
    });
  }, [activePlayableItem, progressDurationSeconds, setActivePlayableItem]);

  useEffect(() => {
    return registerSavedTrackPlaybackRemoteCommandHandlers({
      async next() {
        await playbackController.playNextQueueItem();
      },
      async pause() {
        if (
          !activePlayableItemRef.current ||
          playbackStateRef.current.playbackState === trackPlayerState.Paused
        ) {
          return;
        }

        await playbackController.pauseActivePlayback();
      },
      async play() {
        if (
          !activePlayableItemRef.current ||
          playbackStateRef.current.playbackState === trackPlayerState.Playing
        ) {
          return;
        }

        await playbackController.playActivePlayback();
      },
      async previous() {
        await playbackController.playPreviousQueueItem();
      },
    });
  }, [activePlayableItemRef, playbackController, playbackStateRef]);

  useEffect(() => {
    if (!activePlayableItem) {
      return;
    }

    void syncSavedTrackPlayerCapabilities({
      supportsQueueNavigation: activePlaylistSession !== null,
    }).catch(() => undefined);
  }, [
    activePlayableItem?.id,
    activePlayableItem?.playlistEntryId,
    activePlaylistSession,
  ]);

  const savedTrackPlayerEventHandlerRef = useRef<
    (event: { type: string; message?: string }) => void
  >(() => undefined);
  const savedTrackPlayerEventDispatcherRef = useRef(
    (event: { type: string; message?: string }) => {
      savedTrackPlayerEventHandlerRef.current(event);
    },
  );

  savedTrackPlayerEventHandlerRef.current = (event) => {
    const currentPlayableItem = activePlayableItemRef.current;

    if (event.type === trackPlayerEvent.PlaybackError && currentPlayableItem) {
      setIssue({
        playableItemId: currentPlayableItem.id,
        sourceId: currentPlayableItem.sourceId,
        title: 'Playback failed',
        message: `The saved rehearsal library could not continue "${currentPlayableItem.title}". ${event.message}`,
      });
    }

    if (event.type === trackPlayerEvent.PlaybackQueueEnded) {
      if (activePlaylistSessionRef.current) {
        void playbackController.advancePlaylistPlayback();
        return;
      }

      if (
        activePlayableItemRef.current &&
        shouldRepeatSingleItemPlayback(repeatModeRef.current)
      ) {
        void playbackController.restartActivePlaybackFromRangeStart();
        return;
      }

      setIssue(null);
    }

    setIsPreparing(false);
  };

  useSavedTrackPlayerEvents(
    [trackPlayerEvent.PlaybackError, trackPlayerEvent.PlaybackQueueEnded],
    savedTrackPlayerEventDispatcherRef.current,
  );

  useEffect(() => {
    if (
      !hasSavedTrackPlaybackReachedRangeEnd({
        activePlayableItem,
        playbackState,
        positionSeconds: progressPositionSeconds,
      }) ||
      !activePlayableItem
    ) {
      return;
    }

    let isDisposed = false;

    const stopLoopPlaybackAtRangeEnd = async () => {
      try {
        if (activePlaylistSessionRef.current) {
          await playbackController.advancePlaylistPlayback();
          return;
        }

        if (shouldRepeatSingleItemPlayback(repeatModeRef.current)) {
          await playbackController.seekActivePlayableItemTo(
            activePlayableItem,
            activePlayableItem.range.startMs / 1000,
          );
          return;
        }

        await getSavedTrackPlayer().pause();
        await playbackController.seekActivePlayableItemTo(
          activePlayableItem,
          activePlayableItem.range.startMs / 1000,
        );
      } catch (error) {
        if (!isDisposed) {
          setIssue(
            createSavedTrackPlaybackRuntimeIssue(activePlayableItem, error),
          );
        }
      }
    };

    void stopLoopPlaybackAtRangeEnd();

    return () => {
      isDisposed = true;
    };
  }, [
    activePlayableItem,
    activePlaylistSessionRef,
    playbackController,
    playbackState,
    progressPositionSeconds,
    repeatModeRef,
    setIssue,
  ]);
};
