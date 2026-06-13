import type { PlayableItem } from '@org/audio-library-models';

import {
  resolveSavedTrackDuration,
  type LoadPlayableItemIntoPlayer,
} from '../saved-track-duration-resolution';
import {
  createSavedTrackPlaybackPreconditionIssue,
  createSavedTrackPlaybackRuntimeIssue,
  normalizePlaybackVolumeLevel,
  resolvePlaybackScrubPositionSeconds,
  resolvePlaybackSeekPositionSeconds,
} from '../saved-track-playback-view-model';
import { getSavedTrackPlayer } from '../saved-track-player-interop';
import { ensureSavedTrackPlayerReady } from '../saved-track-player-runtime';
import { createSavedTrackPlaybackRuntimeCore } from './runtime-core';
import {
  canResumeSavedTrackPlayback,
  isActivePlaybackSource,
  type SavedTrackPlaybackControllerOptions,
  trackPlayerState,
} from './shared';

export type SavedTrackPlaybackRuntimeCommands = {
  loadPlayableItem: (playableItem: PlayableItem) => Promise<boolean>;
  loadPlayableItemIntoPlayer: LoadPlayableItemIntoPlayer;
  pauseActivePlayback: () => Promise<boolean>;
  playActivePlayback: () => Promise<void>;
  resolveTrackDuration: (playableItem: PlayableItem) => Promise<number | null>;
  restartActivePlaybackFromRangeStart: () => Promise<void>;
  seekActivePlayableItemTo: (
    playableItem: PlayableItem,
    positionSeconds: number,
  ) => Promise<void>;
  seekActivePlaybackBySeconds: (deltaSeconds: number) => Promise<void>;
  seekActivePlaybackToPosition: (positionSeconds: number) => Promise<void>;
  setPlaybackVolume: (nextVolumeLevel: number) => Promise<void>;
  syncActivePlayableItem: (playableItem: PlayableItem) => Promise<boolean>;
  togglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
};

export const createSavedTrackPlaybackRuntimeCommands = (
  options: SavedTrackPlaybackControllerOptions,
): SavedTrackPlaybackRuntimeCommands => {
  const runtimeCore = createSavedTrackPlaybackRuntimeCore(options);
  const {
    loadPlayableItem,
    loadPlayableItemIntoPlayer,
    pausePlayableItem,
    resumePlayableItem,
    seekActivePlayableItemTo,
  } = runtimeCore;

  return {
    loadPlayableItem,
    loadPlayableItemIntoPlayer,
    async pauseActivePlayback() {
      const currentPlayableItem = options.activePlayableItemRef.current;

      if (!currentPlayableItem) {
        return false;
      }

      return pausePlayableItem(currentPlayableItem);
    },
    async playActivePlayback() {
      const currentPlayableItem = options.activePlayableItemRef.current;

      if (!currentPlayableItem) {
        return;
      }

      options.setIssue(null);

      if (canResumeSavedTrackPlayback(options.playbackState)) {
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
    },
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
    async restartActivePlaybackFromRangeStart() {
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
    async syncActivePlayableItem(playableItem: PlayableItem) {
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

      const shouldResumePlayback =
        options.playbackState === trackPlayerState.Playing ||
        options.playbackState === trackPlayerState.Buffering ||
        options.playbackState === trackPlayerState.Loading;
      const nextPositionSeconds = resolvePlaybackScrubPositionSeconds({
        activePlayableItem: playableItem,
        requestedPositionSeconds: options.progressPositionSeconds,
      });

      options.setIssue(null);
      options.setIsPreparing(true);

      try {
        await loadPlayableItemIntoPlayer(
          playableItem,
          options.authState.accessToken,
          {
            initialPositionSeconds: nextPositionSeconds,
            shouldPlay: shouldResumePlayback,
          },
        );
        return true;
      } catch (error) {
        options.setIssue(
          createSavedTrackPlaybackRuntimeIssue(playableItem, error),
        );
        return false;
      } finally {
        options.setIsPreparing(false);
      }
    },
    async togglePlayableItemPlayback(playableItem: PlayableItem) {
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
        canResumeSavedTrackPlayback(options.playbackState)
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
    },
  };
};
