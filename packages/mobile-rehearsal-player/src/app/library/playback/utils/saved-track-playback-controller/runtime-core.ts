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

/** Where the player actually is, read from it rather than from hook state. */
export type LivePlaybackSnapshot = {
  isPlaying: boolean;
  positionSeconds: number;
};

export type SavedTrackPlaybackRuntimeCore = {
  canLoadPlayableItem: (playableItem: PlayableItem) => boolean;
  isLoadInFlight: () => boolean;
  loadPlayableItem: (playableItem: PlayableItem) => Promise<boolean>;
  loadPlayableItemIntoPlayer: LoadPlayableItemIntoPlayer;
  pausePlayableItem: (playableItem: PlayableItem) => Promise<boolean>;
  readLivePlaybackSnapshot: () => Promise<LivePlaybackSnapshot | null>;
  resumePlayableItem: (playableItem: PlayableItem) => Promise<void>;
  /** Runs `task` as a load: progress is hidden until it settles (8.35). */
  runAsLoad: <Result>(task: () => Promise<Result>) => Promise<Result>;
  seekActivePlayableItemTo: (
    playableItem: PlayableItem,
    positionSeconds: number,
  ) => Promise<void>;
};

export const createSavedTrackPlaybackRuntimeCore = (
  options: SavedTrackPlaybackControllerOptions,
): SavedTrackPlaybackRuntimeCore => {
  let loadsInFlight = 0;

  const runAsLoad = async <Result>(task: () => Promise<Result>) => {
    const epoch = options.progressGate.begin();

    loadsInFlight += 1;

    try {
      return await task();
    } finally {
      loadsInFlight -= 1;
      options.progressGate.settle(epoch);
    }
  };

  /**
   * The player's own position and state, or null while a load owns it (its
   * numbers then describe the file being replaced, not the one being loaded).
   */
  const readLivePlaybackSnapshot =
    async (): Promise<LivePlaybackSnapshot | null> => {
      if (loadsInFlight > 0) {
        return null;
      }

      try {
        const trackPlayer = getSavedTrackPlayer();
        const [progress, playback] = await Promise.all([
          trackPlayer.getProgress(),
          trackPlayer.getPlaybackState(),
        ]);

        return {
          isPlaying:
            playback.state === trackPlayerState.Playing ||
            playback.state === trackPlayerState.Buffering ||
            playback.state === trackPlayerState.Loading,
          positionSeconds: progress.position,
        };
      } catch {
        return null;
      }
    };

  const loadPlayableItemIntoPlayer: LoadPlayableItemIntoPlayer = (
    playableItem,
    accessToken,
    loadOptions,
  ) => {
    return runAsLoad(() =>
      loadIntoPlayer(playableItem, accessToken, loadOptions),
    );
  };

  const loadIntoPlayer: LoadPlayableItemIntoPlayer = async (
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
    isLoadInFlight: () => loadsInFlight > 0,
    loadPlayableItem,
    loadPlayableItemIntoPlayer,
    pausePlayableItem,
    readLivePlaybackSnapshot,
    resumePlayableItem,
    runAsLoad,
    seekActivePlayableItemTo,
  };
};
