import type { PlayableItem } from '@org/audio-library-models';

import { type LoadPlayableItemIntoPlayer } from '../saved-track-duration-resolution';
import {
  createSavedTrackPlaybackPreconditionIssue,
  createSavedTrackPlaybackRequest,
  createSavedTrackPlaybackRuntimeIssue,
} from '../saved-track-playback-view-model';
import { getSavedTrackPlayer } from '../saved-track-player-interop';
import { ensureSavedTrackPlayerReady } from '../saved-track-player-runtime';
import { isSavedTrackDownloadAbortError } from '../saved-track-web-download';
import {
  type SavedTrackPlaybackControllerOptions,
  trackPlayerState,
} from './shared';

export type SavedTrackPlaybackRuntimeCore = {
  canLoadPlayableItem: (playableItem: PlayableItem) => boolean;
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
    const playbackRequest = createSavedTrackPlaybackRequest({
      accessToken,
      playableItem,
    });
    const initialPositionSeconds =
      loadOptions?.initialPositionSeconds ??
      playbackRequest.playableItem.range.startMs / 1000;

    // The item becomes active before anything is awaited (player setup, the
    // web download), so the mini-player and its row show `Loading` in the
    // same frame as the tap (8.33).
    if (loadOptions?.syncActivePlayableItem !== false) {
      options.setActivePlayableItem(playbackRequest.playableItem);
    }

    await ensureSavedTrackPlayerReady();
    const trackPlayer = getSavedTrackPlayer();

    await trackPlayer.reset();
    await trackPlayer.add(playbackRequest.track);
    await trackPlayer.setVolume(options.volumeLevelRef.current);

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

  /** Reports an auth or availability issue that would stop a load starting. */
  const canLoadPlayableItem = (playableItem: PlayableItem) => {
    const blockingIssue = createSavedTrackPlaybackPreconditionIssue(
      options.authState,
      playableItem,
    );

    if (blockingIssue) {
      options.setIssue(blockingIssue);
      return false;
    }

    return Boolean(options.authState.accessToken);
  };

  /**
   * Resolves `false` when the load could not start or was superseded by a
   * newer one (its web download was aborted); callers leave state alone then.
   */
  const loadPlayableItem = async (playableItem: PlayableItem) => {
    const accessToken = options.authState.accessToken;

    if (!canLoadPlayableItem(playableItem) || !accessToken) {
      return false;
    }

    try {
      await loadPlayableItemIntoPlayer(playableItem, accessToken);
    } catch (error) {
      if (isSavedTrackDownloadAbortError(error)) {
        return false;
      }

      throw error;
    }

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
    canLoadPlayableItem,
    loadPlayableItem,
    loadPlayableItemIntoPlayer,
    pausePlayableItem,
    resumePlayableItem,
    seekActivePlayableItemTo,
  };
};
