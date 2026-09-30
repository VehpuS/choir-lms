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
    'canLoadPlayableItem' | 'loadPlayableItem' | 'seekActivePlayableItemTo'
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

      // Paired with the `finally` below, including the early return.
      options.setIsPreparing(true);

      if (!runtimeCommands.canLoadPlayableItem(nextPlayableItem)) {
        return;
      }

      // The queue moves on as soon as the next item starts loading, so queue
      // controls never wait on its download. The advance guard only covers
      // choosing the next item: a further skip during the download supersedes
      // it rather than being ignored.
      options.setActivePlaylistSession(nextSession);
      options.isAdvancingPlaylistRef.current = false;
      await runtimeCommands.loadPlayableItem(nextPlayableItem);
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

      if (!runtimeCommands.canLoadPlayableItem(previousPlayableItem)) {
        return;
      }

      options.setActivePlaylistSession(previousSession);
      options.setIsPreparing(true);

      try {
        await runtimeCommands.loadPlayableItem(previousPlayableItem);
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
