import { type DriveAuthorizationState } from '@org/google-drive';
import type { PlayableItem } from '@org/audio-library-models';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import {
  resolvePlaylistPlaybackAdvance,
  resolvePlaylistPlaybackRewind,
  type PlaylistPlaybackSession,
} from './saved-playlist-playback-view-model';
import {
  createSavedTrackPlaybackPreconditionIssue,
  createSavedTrackPlaybackRequest,
  createSavedTrackPlaybackRuntimeIssue,
  normalizePlaybackVolumeLevel,
  resolvePlaybackScrubPositionSeconds,
  resolvePlaybackSeekPositionSeconds,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from './saved-track-playback-view-model';
import { ensureSavedTrackPlayerReady } from './saved-track-player-runtime';
import {
  getSavedTrackPlayer,
  getSavedTrackPlayerStateMap,
} from './saved-track-player-interop';
import {
  resolveSavedTrackDuration,
  type LoadPlayableItemIntoPlayer,
} from './saved-track-duration-resolution';

const trackPlayerState = getSavedTrackPlayerStateMap();

const isActivePlaybackSource = (
  activePlayableItem: PlayableItem | null,
  playableItem: PlayableItem,
) => {
  return activePlayableItem?.id === playableItem.id;
};

const isSameQueuePosition = (
  activePlayableItem: PlayableItem,
  comparedPlayableItem: PlayableItem,
) => {
  const activeQueuePositionId =
    activePlayableItem.playlistEntryId ?? activePlayableItem.id;
  const comparedQueuePositionId =
    comparedPlayableItem.playlistEntryId ?? comparedPlayableItem.id;

  return activeQueuePositionId === comparedQueuePositionId;
};

type SavedTrackPlaybackControllerOptions = {
  authState: DriveAuthorizationState;
  activePlayableItemRef: MutableRefObject<PlayableItem | null>;
  activePlaylistSessionRef: MutableRefObject<PlaylistPlaybackSession | null>;
  isAdvancingPlaylistRef: MutableRefObject<boolean>;
  isPreparing: boolean;
  playbackState: SavedTrackPlaybackState | undefined;
  progressDurationSeconds: number;
  progressPositionSeconds: number;
  setActivePlayableItem: Dispatch<SetStateAction<PlayableItem | null>>;
  setActivePlaylistSession: Dispatch<
    SetStateAction<PlaylistPlaybackSession | null>
  >;
  setIsPreparing: Dispatch<SetStateAction<boolean>>;
  setIssue: Dispatch<SetStateAction<SavedTrackPlaybackIssue | null>>;
  setVolumeLevel: Dispatch<SetStateAction<number>>;
  volumeLevelRef: MutableRefObject<number>;
};

export const createSavedTrackPlaybackController = (
  options: SavedTrackPlaybackControllerOptions,
) => {
  const loadPlayableItemIntoPlayer: LoadPlayableItemIntoPlayer = async (
    playableItem,
    accessToken,
    loadOptions,
  ) => {
    await ensureSavedTrackPlayerReady();
    const trackPlayer = getSavedTrackPlayer();

    const playbackRequest = createSavedTrackPlaybackRequest({
      accessToken,
      playableItem,
    });
    const initialPositionSeconds =
      loadOptions?.initialPositionSeconds ??
      playbackRequest.playableItem.range.startMs / 1000;

    await trackPlayer.reset();
    await trackPlayer.add(playbackRequest.track);
    await trackPlayer.setVolume(options.volumeLevelRef.current);

    if (loadOptions?.syncActivePlayableItem !== false) {
      options.setActivePlayableItem(playbackRequest.playableItem);
    }

    if (initialPositionSeconds > 0) {
      await trackPlayer.seekTo(initialPositionSeconds);
    }

    if (loadOptions?.shouldPlay ?? true) {
      await trackPlayer.play();
    }

    return playbackRequest.playableItem;
  };

  const seekActivePlayableItemTo = async (
    playableItem: PlayableItem,
    positionSeconds: number,
  ) => {
    await ensureSavedTrackPlayerReady();
    await getSavedTrackPlayer().seekTo(positionSeconds);

    if (
      options.playbackState === trackPlayerState.Ended ||
      options.activePlaylistSessionRef.current?.hasCompleted
    ) {
      options.setActivePlaylistSession((currentSession) => {
        return currentSession
          ? {
              ...currentSession,
              hasCompleted: false,
            }
          : currentSession;
      });
    }
  };

  const loadPlayableItem = async (playableItem: PlayableItem) => {
    const blockingIssue = createSavedTrackPlaybackPreconditionIssue(
      options.authState,
      playableItem,
    );

    if (blockingIssue) {
      options.setIssue(blockingIssue);
      return false;
    }

    if (!options.authState.accessToken) {
      return false;
    }

    await loadPlayableItemIntoPlayer(
      playableItem,
      options.authState.accessToken,
    );

    return true;
  };

  const pausePlayableItem = async (playableItem: PlayableItem) => {
    try {
      await getSavedTrackPlayer().pause();
    } catch (error) {
      options.setIssue(
        createSavedTrackPlaybackRuntimeIssue(playableItem, error),
      );
    }
  };

  const resumePlayableItem = async (playableItem: PlayableItem) => {
    options.setIssue(null);
    options.setIsPreparing(true);

    try {
      await ensureSavedTrackPlayerReady();

      if (
        options.playbackState === trackPlayerState.Ended ||
        options.activePlaylistSessionRef.current?.hasCompleted
      ) {
        await seekActivePlayableItemTo(
          playableItem,
          playableItem.range.startMs / 1000,
        );
      }

      await getSavedTrackPlayer().play();
    } catch (error) {
      options.setIssue(
        createSavedTrackPlaybackRuntimeIssue(playableItem, error),
      );
    } finally {
      options.setIsPreparing(false);
    }
  };

  const pauseActivePlayback = async () => {
    const currentPlayableItem = options.activePlayableItemRef.current;

    if (!currentPlayableItem) {
      return;
    }

    await pausePlayableItem(currentPlayableItem);
  };

  const playActivePlayback = async () => {
    const currentPlayableItem = options.activePlayableItemRef.current;

    if (!currentPlayableItem) {
      return;
    }

    options.setIssue(null);

    if (
      options.playbackState !== undefined &&
      options.playbackState !== trackPlayerState.Error &&
      options.playbackState !== trackPlayerState.None
    ) {
      await resumePlayableItem(currentPlayableItem);
      return;
    }

    options.setIsPreparing(true);

    try {
      await loadPlayableItem(currentPlayableItem);
    } catch (error) {
      options.setIssue(
        createSavedTrackPlaybackRuntimeIssue(currentPlayableItem, error),
      );
    } finally {
      options.setIsPreparing(false);
    }
  };

  const restartActivePlaybackFromRangeStart = async () => {
    const currentPlayableItem = options.activePlayableItemRef.current;

    if (!currentPlayableItem) {
      return;
    }

    options.setIssue(null);
    options.setIsPreparing(true);

    try {
      await seekActivePlayableItemTo(
        currentPlayableItem,
        currentPlayableItem.range.startMs / 1000,
      );
      await getSavedTrackPlayer().play();
    } catch (error) {
      options.setIssue(
        createSavedTrackPlaybackRuntimeIssue(currentPlayableItem, error),
      );
    } finally {
      options.setIsPreparing(false);
    }
  };

  const advancePlaylistPlayback = async () => {
    const currentSession = options.activePlaylistSessionRef.current;
    const currentPlayableItem = options.activePlayableItemRef.current;

    if (
      !currentSession ||
      !currentPlayableItem ||
      options.isAdvancingPlaylistRef.current
    ) {
      return;
    }

    options.isAdvancingPlaylistRef.current = true;
    options.setIssue(null);

    try {
      const { nextPlayableItem, nextSession } =
        resolvePlaylistPlaybackAdvance(currentSession);

      if (!nextPlayableItem) {
        options.setActivePlaylistSession(nextSession);
        const trackPlayer = getSavedTrackPlayer();

        await trackPlayer.pause();
        await trackPlayer.seekTo(currentPlayableItem.range.startMs / 1000);
        return;
      }

      options.setIsPreparing(true);

      if (await loadPlayableItem(nextPlayableItem)) {
        options.setActivePlaylistSession(nextSession);
      }
    } catch (error) {
      options.setIssue(
        createSavedTrackPlaybackRuntimeIssue(currentPlayableItem, error),
      );
    } finally {
      options.setIsPreparing(false);
      options.isAdvancingPlaylistRef.current = false;
    }
  };

  const togglePlayableItemPlayback = async (playableItem: PlayableItem) => {
    const isCurrentPlayableItem = isActivePlaybackSource(
      options.activePlayableItemRef.current,
      playableItem,
    );
    const blockingIssue = createSavedTrackPlaybackPreconditionIssue(
      options.authState,
      playableItem,
    );

    if (!isCurrentPlayableItem && blockingIssue) {
      options.setIssue(blockingIssue);
      return;
    }

    options.setIssue(null);

    if (
      isCurrentPlayableItem &&
      options.playbackState === trackPlayerState.Playing
    ) {
      await pausePlayableItem(playableItem);
      return;
    }

    if (
      isCurrentPlayableItem &&
      options.playbackState !== undefined &&
      options.playbackState !== trackPlayerState.Error &&
      options.playbackState !== trackPlayerState.None
    ) {
      await resumePlayableItem(playableItem);
      return;
    }

    options.setIsPreparing(true);

    try {
      if (await loadPlayableItem(playableItem)) {
        options.setActivePlaylistSession(null);
      }
    } catch (error) {
      options.setIssue(
        createSavedTrackPlaybackRuntimeIssue(playableItem, error),
      );
    } finally {
      options.setIsPreparing(false);
    }
  };

  const playPreviousQueueItem = async () => {
    const currentPlayableItem = options.activePlayableItemRef.current;
    const currentSession = options.activePlaylistSessionRef.current;

    if (!currentPlayableItem) {
      return;
    }

    options.setIssue(null);

    if (!currentSession) {
      try {
        await seekActivePlayableItemTo(
          currentPlayableItem,
          currentPlayableItem.range.startMs / 1000,
        );
      } catch (error) {
        options.setIssue(
          createSavedTrackPlaybackRuntimeIssue(currentPlayableItem, error),
        );
      }

      return;
    }

    const { previousPlayableItem, previousSession } =
      resolvePlaylistPlaybackRewind(currentSession);

    if (!previousPlayableItem) {
      return;
    }

    if (isSameQueuePosition(previousPlayableItem, currentPlayableItem)) {
      try {
        await seekActivePlayableItemTo(
          currentPlayableItem,
          currentPlayableItem.range.startMs / 1000,
        );
        options.setActivePlaylistSession(previousSession);
      } catch (error) {
        options.setIssue(
          createSavedTrackPlaybackRuntimeIssue(currentPlayableItem, error),
        );
      }

      return;
    }

    options.setIsPreparing(true);

    try {
      if (await loadPlayableItem(previousPlayableItem)) {
        options.setActivePlaylistSession(previousSession);
      }
    } catch (error) {
      options.setIssue(
        createSavedTrackPlaybackRuntimeIssue(previousPlayableItem, error),
      );
    } finally {
      options.setIsPreparing(false);
    }
  };

  return {
    advancePlaylistPlayback,
    pauseActivePlayback,
    playActivePlayback,
    restartActivePlaybackFromRangeStart,
    async playNextQueueItem() {
      if (!options.activePlaylistSessionRef.current) {
        return;
      }

      await advancePlaylistPlayback();
    },
    playPreviousQueueItem,
    resolveTrackDuration(playableItem: PlayableItem) {
      return resolveSavedTrackDuration(playableItem, {
        accessToken: options.authState.accessToken,
        activePlayableItem: options.activePlayableItemRef.current,
        isPreparing: options.isPreparing,
        loadPlayableItemIntoPlayer,
        playbackState: options.playbackState,
        progressDurationSeconds: options.progressDurationSeconds,
        progressPositionSeconds: options.progressPositionSeconds,
        setIssue: options.setIssue,
      });
    },
    seekActivePlayableItemTo,
    async seekActivePlaybackBySeconds(deltaSeconds: number) {
      const currentPlayableItem = options.activePlayableItemRef.current;

      if (!currentPlayableItem) {
        return;
      }

      options.setIssue(null);

      try {
        const nextPositionSeconds = resolvePlaybackSeekPositionSeconds({
          activePlayableItem: currentPlayableItem,
          currentPositionSeconds: options.progressPositionSeconds,
          deltaSeconds,
        });

        await seekActivePlayableItemTo(
          currentPlayableItem,
          nextPositionSeconds,
        );
      } catch (error) {
        options.setIssue(
          createSavedTrackPlaybackRuntimeIssue(currentPlayableItem, error),
        );
      }
    },
    async seekActivePlaybackToPosition(positionSeconds: number) {
      const currentPlayableItem = options.activePlayableItemRef.current;

      if (!currentPlayableItem) {
        return;
      }

      options.setIssue(null);

      try {
        const nextPositionSeconds = resolvePlaybackScrubPositionSeconds({
          activePlayableItem: currentPlayableItem,
          requestedPositionSeconds: positionSeconds,
        });

        await seekActivePlayableItemTo(
          currentPlayableItem,
          nextPositionSeconds,
        );
      } catch (error) {
        options.setIssue(
          createSavedTrackPlaybackRuntimeIssue(currentPlayableItem, error),
        );
      }
    },
    async setPlaybackVolume(nextVolumeLevel: number) {
      const normalizedVolumeLevel =
        normalizePlaybackVolumeLevel(nextVolumeLevel);

      options.volumeLevelRef.current = normalizedVolumeLevel;
      options.setVolumeLevel(normalizedVolumeLevel);

      try {
        await ensureSavedTrackPlayerReady();
        await getSavedTrackPlayer().setVolume(normalizedVolumeLevel);
      } catch (error) {
        const currentPlayableItem = options.activePlayableItemRef.current;

        if (!currentPlayableItem) {
          return;
        }

        options.setIssue(
          createSavedTrackPlaybackRuntimeIssue(currentPlayableItem, error),
        );
      }
    },
    togglePlayableItemPlayback,
    loadPlayableItem,
  };
};
