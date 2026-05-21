import { type DriveAuthorizationState } from '@org/google-drive';
import { type PlayableItem } from '@org/rehearsal-domain';
import { useState } from 'react';
import TrackPlayer, {
  Capability,
  Event,
  State,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';

import type { DriveLibrarySource } from './drive-library-view-model';
import {
  createSavedTrackPlaybackPreconditionIssue,
  createSavedTrackPlaybackRequest,
  createSavedTrackPlaybackRuntimeIssue,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from './saved-track-playback-view-model';

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
  source: DriveLibrarySource,
) => {
  return activePlayableItem?.sourceId === source.id;
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

  return {
    activePlayableItem,
    isPreparing,
    issue,
    playbackState,
    progress,
    async toggleSourcePlayback(source: DriveLibrarySource) {
      const isCurrentSource = isActivePlaybackSource(
        activePlayableItem,
        source,
      );
      const blockingIssue = createSavedTrackPlaybackPreconditionIssue(
        authState,
        source,
      );

      if (!isCurrentSource && blockingIssue) {
        setIssue(blockingIssue);
        return;
      }

      setIssue(null);

      if (isCurrentSource && playbackState === State.Playing) {
        try {
          await TrackPlayer.pause();
        } catch (error) {
          setIssue(createSavedTrackPlaybackRuntimeIssue(source, error));
        }

        return;
      }

      setIsPreparing(true);

      try {
        await ensureSavedTrackPlayerReady();

        if (
          isCurrentSource &&
          playbackState !== undefined &&
          playbackState !== State.Error &&
          playbackState !== State.None
        ) {
          if (playbackState === State.Ended) {
            await TrackPlayer.seekTo(0);
          }

          await TrackPlayer.play();
          return;
        }

        if (!authState.accessToken) {
          setIssue(
            createSavedTrackPlaybackPreconditionIssue(authState, source),
          );
          return;
        }

        const playbackRequest = createSavedTrackPlaybackRequest({
          accessToken: authState.accessToken,
          source,
        });

        await TrackPlayer.reset();
        await TrackPlayer.add(playbackRequest.track);
        setActivePlayableItem(playbackRequest.playableItem);
        await TrackPlayer.play();
      } catch (error) {
        setIssue(createSavedTrackPlaybackRuntimeIssue(source, error));
      } finally {
        setIsPreparing(false);
      }
    },
  };
};
