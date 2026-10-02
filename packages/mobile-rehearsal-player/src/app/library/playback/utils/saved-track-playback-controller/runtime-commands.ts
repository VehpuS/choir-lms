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
import { getPlaybackShapingSession } from '../../shaping';
import { getSavedTrackPlayer } from '../saved-track-player-interop';
import { ensureSavedTrackPlayerReady } from '../saved-track-player-runtime';
import { isSavedTrackDownloadAbortError } from '../saved-track-web-download';
import { createSavedTrackPlaybackRuntimeCore } from './runtime-core';
import {
  canResumeSavedTrackPlayback,
  isActivePlaybackSource,
  type SavedTrackPlaybackControllerOptions,
  trackPlayerState,
} from './shared';

export type SavedTrackPlaybackRuntimeCommands = {
  canLoadPlayableItem: (playableItem: PlayableItem) => boolean;
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
    canLoadPlayableItem,
    loadPlayableItem,
    loadPlayableItemIntoPlayer,
    pausePlayableItem,
    readLivePlaybackSnapshot,
    resumePlayableItem,
    runAsLoad,
    seekActivePlayableItemTo,
  } = runtimeCore;

  return {
    canLoadPlayableItem,
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
    async resolveTrackDuration(playableItem: PlayableItem) {
      // The probe replaces what is loaded, then restores it: read where the
      // player is before it is touched, not from hook state (8.35).
      const live = await readLivePlaybackSnapshot();

      return runAsLoad(() =>
        resolveSavedTrackDuration(playableItem, {
          accessToken: options.authState.accessToken,
          activePlayableItem: options.activePlayableItemRef.current,
          isPreparing: options.isPreparing,
          livePlayback: live,
          loadPlayableItemIntoPlayer,
          playbackState: options.playbackState,
          progressDurationSeconds: options.progressDurationSeconds,
          progressPositionSeconds: options.progressPositionSeconds,
          setIssue: options.setIssue,
        }),
      );
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

      // A reload for changed audio continues from where the player really is.
      // While another load owns the player there is nothing to continue: that
      // load was a request to play this item, so start it from its beginning.
      const live = await readLivePlaybackSnapshot();
      const shouldResumePlayback = live?.isPlaying ?? true;
      const nextPositionSeconds = resolvePlaybackScrubPositionSeconds({
        activePlayableItem: playableItem,
        requestedPositionSeconds:
          live?.positionSeconds ?? playableItem.range.startMs / 1000,
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
        if (!isSavedTrackDownloadAbortError(error)) {
          options.setIssue(
            createSavedTrackPlaybackRuntimeIssue(playableItem, error),
          );
        }

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

      if (!canLoadPlayableItem(playableItem)) {
        return;
      }

      // Standalone playback leaves any queue as soon as it starts loading, so
      // the mini-player never pairs the new item with the old queue context.
      options.setActivePlaylistSession(null);
      // A different item the user chose is a new start: ambient shaping from
      // an earlier item does not carry over (queue advances do not come here).
      getPlaybackShapingSession().startNewPlayback();
      options.setIsPreparing(true);

      try {
        await loadPlayableItem(playableItem);
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
