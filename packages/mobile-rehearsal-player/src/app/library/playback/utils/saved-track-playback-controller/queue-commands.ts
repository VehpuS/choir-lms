import {
  resolvePlaylistPlaybackAdvance,
  resolvePlaylistPlaybackRewind,
} from '../../../playlists/utils/saved-playlist-playback-view-model';
import { createSavedTrackPlaybackRuntimeIssue } from '../saved-track-playback-view-model';
import { getSavedTrackPlayer } from '../saved-track-player-interop';
import type { SavedTrackPlaybackRuntimeCommands } from './runtime-commands';
import {
  isSameQueuePosition,
  type SavedTrackPlaybackControllerOptions,
} from './shared';

export const createSavedTrackPlaybackQueueCommands = (
  options: SavedTrackPlaybackControllerOptions,
  runtimeCommands: Pick<
    SavedTrackPlaybackRuntimeCommands,
    'loadPlayableItem' | 'seekActivePlayableItemTo'
  >,
) => {
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

      if (await runtimeCommands.loadPlayableItem(nextPlayableItem)) {
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

  return {
    advancePlaylistPlayback,
    async playNextQueueItem() {
      if (!options.activePlaylistSessionRef.current) {
        return;
      }

      await advancePlaylistPlayback();
    },
    async playPreviousQueueItem() {
      const currentPlayableItem = options.activePlayableItemRef.current;
      const currentSession = options.activePlaylistSessionRef.current;

      if (!currentPlayableItem) {
        return;
      }

      options.setIssue(null);

      if (!currentSession) {
        try {
          await runtimeCommands.seekActivePlayableItemTo(
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
          await runtimeCommands.seekActivePlayableItemTo(
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
        if (await runtimeCommands.loadPlayableItem(previousPlayableItem)) {
          options.setActivePlaylistSession(previousSession);
        }
      } catch (error) {
        options.setIssue(
          createSavedTrackPlaybackRuntimeIssue(previousPlayableItem, error),
        );
      } finally {
        options.setIsPreparing(false);
      }
    },
  };
};