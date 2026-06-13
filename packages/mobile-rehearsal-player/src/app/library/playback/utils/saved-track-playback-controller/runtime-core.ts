import type { PlayableItem } from '@org/audio-library-models';

import { type LoadPlayableItemIntoPlayer } from '../saved-track-duration-resolution';
import {
  createSavedTrackPlaybackPreconditionIssue,
  createSavedTrackPlaybackRequest,
  createSavedTrackPlaybackRuntimeIssue,
} from '../saved-track-playback-view-model';
import { getSavedTrackPlayer } from '../saved-track-player-interop';
import { ensureSavedTrackPlayerReady } from '../saved-track-player-runtime';
import {
  type SavedTrackPlaybackControllerOptions,
  trackPlayerState,
} from './shared';

export type SavedTrackPlaybackRuntimeCore = {
  loadPlayableItem: (playableItem: PlayableItem) => Promise<boolean>;
  loadPlayableItemIntoPlayer: LoadPlayableItemIntoPlayer;
  pausePlayableItem: (playableItem: PlayableItem) => Promise<boolean>;
  resumePlayableItem: (playableItem: PlayableItem) => Promise<void>;
  seekActivePlayableItemTo: (
    playableItem: PlayableItem,
    positionSeconds: number,
  ) => Promise<void>;
};

export const createSavedTrackPlaybackRuntimeCore = (
  options: SavedTrackPlaybackControllerOptions,
): SavedTrackPlaybackRuntimeCore => {
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
      return true;
    } catch (error) {
      options.setIssue(
        createSavedTrackPlaybackRuntimeIssue(playableItem, error),
      );
      return false;
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

  return {
    loadPlayableItem,
    loadPlayableItemIntoPlayer,
    pausePlayableItem,
    resumePlayableItem,
    seekActivePlayableItemTo,
  };
};
