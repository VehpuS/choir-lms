import { type DriveAuthorizationState } from '@org/google-drive';
import {
  createTrackPlayableItem,
  type NamedLoop,
  type Playlist,
  type PlayableItem,
  type RehearsalQueueMode,
  type RepeatMode,
} from '@org/audio-library-models';
import { useEffect, useRef, useState } from 'react';
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
  buildPlaylistPlaybackSession,
  getPlaylistPlaybackCurrentItem,
  resolvePlaylistPlaybackAdvance,
  updatePlaylistPlaybackRepeatMode,
  type PlaylistPlaybackIssue,
  type PlaylistPlaybackSession,
} from '../utils/saved-playlist-playback-view-model';
import {
  createSavedTrackPlaybackPreconditionIssue,
  createSavedTrackPlaybackRequest,
  createSavedTrackPlaybackRuntimeIssue,
  hasSavedTrackPlaybackReachedRangeEnd,
  isTrackPlayerAlreadyInitializedError,
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
      .catch((error) => {
        if (isTrackPlayerAlreadyInitializedError(error)) {
          return;
        }

        throw error;
      })
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

const mapPlaylistPlaybackIssue = (issue: PlaylistPlaybackIssue) => {
  return {
    message: issue.message,
    playlistId: issue.playlistId,
    title: issue.title,
  } satisfies SavedTrackPlaybackIssue;
};

export const useSavedTrackPlayback = (authState: DriveAuthorizationState) => {
  const [activePlayableItem, setActivePlayableItem] =
    useState<PlayableItem | null>(null);
  const [activePlaylistSession, setActivePlaylistSession] =
    useState<PlaylistPlaybackSession | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [issue, setIssue] = useState<SavedTrackPlaybackIssue | null>(null);
  const [playlistRepeatMode, setPlaylistRepeatModeState] =
    useState<RepeatMode>('off');
  const activePlayableItemRef = useRef<PlayableItem | null>(null);
  const activePlaylistSessionRef = useRef<PlaylistPlaybackSession | null>(null);
  const isAdvancingPlaylistRef = useRef(false);
  const playbackState = usePlaybackState().state as
    | SavedTrackPlaybackState
    | undefined;
  const progress = useProgress(500);

  useEffect(() => {
    activePlayableItemRef.current = activePlayableItem;
  }, [activePlayableItem]);

  useEffect(() => {
    activePlaylistSessionRef.current = activePlaylistSession;
  }, [activePlaylistSession]);

  const loadPlayableItem = async (playableItem: PlayableItem) => {
    const blockingIssue = createSavedTrackPlaybackPreconditionIssue(
      authState,
      playableItem,
    );

    if (blockingIssue) {
      setIssue(blockingIssue);
      return false;
    }

    const accessToken = authState.accessToken;

    if (!accessToken) {
      return false;
    }

    await ensureSavedTrackPlayerReady();

    const playbackRequest = createSavedTrackPlaybackRequest({
      accessToken,
      playableItem,
    });

    await TrackPlayer.reset();
    await TrackPlayer.add(playbackRequest.track);
    setActivePlayableItem(playbackRequest.playableItem);

    if (playbackRequest.playableItem.range.startMs > 0) {
      await TrackPlayer.seekTo(playbackRequest.playableItem.range.startMs / 1000);
    }

    await TrackPlayer.play();
    return true;
  };

  const pausePlayableItem = async (playableItem: PlayableItem) => {
    try {
      await TrackPlayer.pause();
    } catch (error) {
      setIssue(createSavedTrackPlaybackRuntimeIssue(playableItem, error));
    }
  };

  const resumePlayableItem = async (playableItem: PlayableItem) => {
    setIssue(null);
    setIsPreparing(true);

    try {
      await ensureSavedTrackPlayerReady();

      if (
        playbackState === State.Ended ||
        activePlaylistSessionRef.current?.hasCompleted
      ) {
        await TrackPlayer.seekTo(playableItem.range.startMs / 1000);
        setActivePlaylistSession((currentSession) => {
          return currentSession
            ? {
                ...currentSession,
                hasCompleted: false,
              }
            : currentSession;
        });
      }

      await TrackPlayer.play();
    } catch (error) {
      setIssue(createSavedTrackPlaybackRuntimeIssue(playableItem, error));
    } finally {
      setIsPreparing(false);
    }
  };

  const advancePlaylistPlayback = async () => {
    const currentSession = activePlaylistSessionRef.current;
    const currentPlayableItem = activePlayableItemRef.current;

    if (
      !currentSession ||
      !currentPlayableItem ||
      isAdvancingPlaylistRef.current
    ) {
      return;
    }

    isAdvancingPlaylistRef.current = true;
    setIssue(null);

    try {
      const { nextPlayableItem, nextSession } =
        resolvePlaylistPlaybackAdvance(currentSession);

      if (!nextPlayableItem) {
        setActivePlaylistSession(nextSession);
        await TrackPlayer.pause();
        await TrackPlayer.seekTo(currentPlayableItem.range.startMs / 1000);
        return;
      }

      setIsPreparing(true);

      const didStart = await loadPlayableItem(nextPlayableItem);

      if (didStart) {
        setActivePlaylistSession(nextSession);
      }
    } catch (error) {
      setIssue(createSavedTrackPlaybackRuntimeIssue(currentPlayableItem, error));
    } finally {
      setIsPreparing(false);
      isAdvancingPlaylistRef.current = false;
    }
  };

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
        if (activePlaylistSessionRef.current) {
          void advancePlaylistPlayback();
          return;
        }

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
        if (activePlaylistSessionRef.current) {
          await advancePlaylistPlayback();
          return;
        }

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
      activePlayableItemRef.current,
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
      await pausePlayableItem(playableItem);
      return;
    }

    if (
      isCurrentPlayableItem &&
      playbackState !== undefined &&
      playbackState !== State.Error &&
      playbackState !== State.None
    ) {
      await resumePlayableItem(playableItem);
      return;
    }

    setIsPreparing(true);

    try {
      const didStart = await loadPlayableItem(playableItem);

      if (didStart) {
        setActivePlaylistSession(null);
      }
    } catch (error) {
      setIssue(createSavedTrackPlaybackRuntimeIssue(playableItem, error));
    } finally {
      setIsPreparing(false);
    }
  };

  return {
    activePlayableItem,
    activePlaylistSession,
    isPreparing,
    issue,
    playbackState,
    playlistRepeatMode,
    progress,
    setPlaylistRepeatMode(repeatMode: RepeatMode) {
      setPlaylistRepeatModeState(repeatMode);
      setActivePlaylistSession((currentSession) => {
        return currentSession
          ? updatePlaylistPlaybackRepeatMode(currentSession, repeatMode)
          : currentSession;
      });
    },
    togglePlayableItemPlayback,
    async togglePlaylistPlayback(options: {
      loops: NamedLoop[];
      mode: RehearsalQueueMode;
      playlist: Playlist;
      sources: DriveLibrarySource[];
    }) {
      const nextSession = buildPlaylistPlaybackSession({
        loops: options.loops,
        mode: options.mode,
        playlist: options.playlist,
        repeatMode: playlistRepeatMode,
        sources: options.sources,
      });

      if (nextSession.issue || !nextSession.session) {
        setActivePlaylistSession(null);
        setIssue(
          nextSession.issue ? mapPlaylistPlaybackIssue(nextSession.issue) : null,
        );
        return;
      }

      const firstPlayableItem = getPlaylistPlaybackCurrentItem(
        nextSession.session,
      );

      if (!firstPlayableItem) {
        setActivePlaylistSession(null);
        setIssue(
          mapPlaylistPlaybackIssue({
            message:
              'This rehearsal playlist does not currently contain any playable saved tracks or loops.',
            playlistId: options.playlist.id,
            title: 'Playlist has no playable items',
          }),
        );
        return;
      }

      setIssue(null);
      setIsPreparing(true);

      try {
        const didStart = await loadPlayableItem(firstPlayableItem);

        if (didStart) {
          setActivePlaylistSession(nextSession.session);
        }
      } catch (error) {
        setIssue(createSavedTrackPlaybackRuntimeIssue(firstPlayableItem, error));
      } finally {
        setIsPreparing(false);
      }
    },
    async toggleSourcePlayback(source: DriveLibrarySource) {
      await togglePlayableItemPlayback(createTrackPlayableItem(source));
    },
  };
};
