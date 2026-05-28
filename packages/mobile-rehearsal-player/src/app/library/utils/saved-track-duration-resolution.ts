import type { PlayableItem } from '@org/audio-library-models';
import type { Dispatch, SetStateAction } from 'react';

import {
  createSavedTrackPlaybackRuntimeIssue,
  resolvePlaybackScrubPositionSeconds,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from './saved-track-playback-view-model';
import {
  getSavedTrackPlayer,
  getSavedTrackPlayerStateMap,
} from './saved-track-player-interop';
import { resolveSavedTrackDurationFromPlayer } from './saved-track-player-runtime';

const trackPlayerState = getSavedTrackPlayerStateMap();

export type LoadPlayableItemIntoPlayer = (
  playableItem: PlayableItem,
  accessToken: string,
  options?: {
    initialPositionSeconds?: number;
    shouldPlay?: boolean;
    syncActivePlayableItem?: boolean;
  },
) => Promise<PlayableItem>;

type ResolveSavedTrackDurationOptions = {
  accessToken: string | null | undefined;
  activePlayableItem: PlayableItem | null;
  isPreparing: boolean;
  loadPlayableItemIntoPlayer: LoadPlayableItemIntoPlayer;
  playbackState: SavedTrackPlaybackState | undefined;
  progressDurationSeconds: number;
  progressPositionSeconds: number;
  setIssue: Dispatch<SetStateAction<SavedTrackPlaybackIssue | null>>;
};

export const resolveSavedTrackDuration = async (
  playableItem: PlayableItem,
  options: ResolveSavedTrackDurationOptions,
) => {
  const accessToken = options.accessToken;

  if (!accessToken) {
    return null;
  }

  if (playableItem.source.durationMs !== undefined) {
    return playableItem.source.durationMs;
  }

  if (
    options.activePlayableItem?.kind === 'track' &&
    options.activePlayableItem.sourceId === playableItem.sourceId &&
    options.progressDurationSeconds > 0
  ) {
    return Math.round(options.progressDurationSeconds * 1000);
  }

  const currentPlayableItem = options.activePlayableItem;
  const shouldRestorePlayback =
    currentPlayableItem !== null && !options.isPreparing;
  const shouldResumePlayback =
    options.playbackState === trackPlayerState.Playing ||
    options.playbackState === trackPlayerState.Buffering ||
    options.playbackState === trackPlayerState.Loading;

  try {
    return await resolveSavedTrackDurationFromPlayer({
      accessToken,
      playableItem,
    });
  } finally {
    if (currentPlayableItem && shouldRestorePlayback) {
      try {
        const restorePositionSeconds = resolvePlaybackScrubPositionSeconds({
          activePlayableItem: currentPlayableItem,
          requestedPositionSeconds: options.progressPositionSeconds,
        });

        await options.loadPlayableItemIntoPlayer(
          currentPlayableItem,
          accessToken,
          {
            initialPositionSeconds: restorePositionSeconds,
            shouldPlay: shouldResumePlayback,
            syncActivePlayableItem: false,
          },
        );

        if (!shouldResumePlayback) {
          await getSavedTrackPlayer().pause();
        }
      } catch (error) {
        options.setIssue(
          createSavedTrackPlaybackRuntimeIssue(currentPlayableItem, error),
        );
      }
    }
  }
};
