import { type DriveAuthorizationState } from '@org/google-drive';
import {
  createTrackPlayableItem,
  type PlayableItem,
} from '@org/audio-library-models';
import { useEffect, useState } from 'react';
import TrackPlayer, {
  Capability,
  Event,
  State,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';

import type { DriveLibrarySource } from '../utils/drive-library-view-model';
import {
  createSavedTrackPlaybackPreconditionIssue,
  createSavedTrackPlaybackRequest,
  createSavedTrackPlaybackRuntimeIssue,
  hasSavedTrackPlaybackReachedRangeEnd,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../utils/saved-track-playback-view-model';

const PLAYER_CAPABILITIES = [
  Capability.Play,
  Capability.Pause,
  Capability.Stop,
  Capability.SeekTo,
];

let playerSetupPromise: Promise<void> | null = null;

const ensureSavedTrackPlayerReady = () => {
  if (!playerSetupPromise) {
    playerSetupPromise = TrackPlayer.setupPlayer()
      .then(async () => {
        await TrackPlayer.updateOptions({
          capabilities: PLAYER_CAPABILITIES,
          compactCapabilities: [Capability.Play, Capability.Pause],
          notificationCapabilities: PLAYER_CAPABILITIES,
        });
      })
      .catch((error) => {
        playerSetupPromise = null;
        throw error;
      });
  }

  return playerSetupPromise;
};

const isActivePlaybackSource = (
  activePlayableItem: PlayableItem | null,
  playableItem: PlayableItem,
) => {
  return activePlayableItem?.id === playableItem.id;
};

export const useSavedTrackPlayback = (authState: DriveAuthorizationState) => {
  const [activePlayableItem, setActivePlayableItem] =
    useState<PlayableItem | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [issue, setIssue] = useState<SavedTrackPlaybackIssue | null>(null);
  const playbackState = usePlaybackState().state as
    | SavedTrackPlaybackState
    | undefined;
  const progress = useProgress(500);

  useTrackPlayerEvents(
    [Event.PlaybackError, Event.PlaybackQueueEnded],
    (event) => {
      if (event.type === Event.PlaybackError && activePlayableItem) {
        setIssue({
          playableItemId: activePlayableItem.id,
          sourceId: activePlayableItem.sourceId,
          title: 'Playback failed',
          message: `The saved rehearsal library could not continue "${activePlayableItem.title}". ${event.message}`,
        });
      }

      if (event.type === Event.PlaybackQueueEnded) {
        setIssue(null);
      }

      setIsPreparing(false);
    },
  );

  useEffect(() => {
    if (
      !hasSavedTrackPlaybackReachedRangeEnd({
        activePlayableItem,
        playbackState,
        positionSeconds: progress.position,
      }) ||
      !activePlayableItem
    ) {
      return;
    }

    let isDisposed = false;

    const stopLoopPlaybackAtRangeEnd = async () => {
      try {
        await TrackPlayer.pause();
        await TrackPlayer.seekTo(activePlayableItem.range.startMs / 1000);
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
  }, [activePlayableItem, playbackState, progress.position]);

  const togglePlayableItemPlayback = async (playableItem: PlayableItem) => {
    const isCurrentPlayableItem = isActivePlaybackSource(
      activePlayableItem,
      playableItem,
    );
    const blockingIssue = createSavedTrackPlaybackPreconditionIssue(
      authState,
      playableItem,
    );

    if (!isCurrentPlayableItem && blockingIssue) {
      setIssue(blockingIssue);
      return;
    }

    setIssue(null);

    if (isCurrentPlayableItem && playbackState === State.Playing) {
      try {
        await TrackPlayer.pause();
      } catch (error) {
        setIssue(createSavedTrackPlaybackRuntimeIssue(playableItem, error));
      }

      return;
    }

    setIsPreparing(true);

    try {
      await ensureSavedTrackPlayerReady();

      if (
        isCurrentPlayableItem &&
        playbackState !== undefined &&
        playbackState !== State.Error &&
        playbackState !== State.None
      ) {
        if (playbackState === State.Ended) {
          await TrackPlayer.seekTo(playableItem.range.startMs / 1000);
        }

        await TrackPlayer.play();
        return;
      }

      if (!authState.accessToken) {
        setIssue(
          createSavedTrackPlaybackPreconditionIssue(authState, playableItem),
        );
        return;
      }

      const playbackRequest = createSavedTrackPlaybackRequest({
        accessToken: authState.accessToken,
        playableItem,
      });

      await TrackPlayer.reset();
      await TrackPlayer.add(playbackRequest.track);
      setActivePlayableItem(playbackRequest.playableItem);

      if (playbackRequest.playableItem.range.startMs > 0) {
        await TrackPlayer.seekTo(
          playbackRequest.playableItem.range.startMs / 1000,
        );
      }

      await TrackPlayer.play();
    } catch (error) {
      setIssue(createSavedTrackPlaybackRuntimeIssue(playableItem, error));
    } finally {
      setIsPreparing(false);
    }
  };

  return {
    activePlayableItem,
    isPreparing,
    issue,
    playbackState,
    progress,
    togglePlayableItemPlayback,
    async toggleSourcePlayback(source: DriveLibrarySource) {
      await togglePlayableItemPlayback(createTrackPlayableItem(source));
    },
  };
};
