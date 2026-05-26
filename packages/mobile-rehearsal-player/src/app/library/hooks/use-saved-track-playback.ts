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
  Event,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';

import type { DriveLibrarySource } from '../utils/drive-library-view-model';
import {
  buildPlaylistPlaybackSession,
  getPlaylistPlaybackCurrentItem,
  updatePlaylistPlaybackRepeatMode,
  type PlaylistPlaybackIssue,
  type PlaylistPlaybackSession,
} from '../utils/saved-playlist-playback-view-model';
import {
  createSavedTrackPlaybackRuntimeIssue,
  hasSavedTrackPlaybackReachedRangeEnd,
  normalizePlaybackVolumeLevel,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../utils/saved-track-playback-view-model';
import { createSavedTrackPlaybackController } from '../utils/saved-track-playback-controller';
import { ensureSavedTrackPlayerReady } from '../utils/saved-track-player-runtime';

const DEFAULT_PLAYBACK_VOLUME_LEVEL = 1;

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
  const [volumeLevel, setVolumeLevel] = useState(DEFAULT_PLAYBACK_VOLUME_LEVEL);
  const activePlayableItemRef = useRef<PlayableItem | null>(null);
  const activePlaylistSessionRef = useRef<PlaylistPlaybackSession | null>(null);
  const isAdvancingPlaylistRef = useRef(false);
  const volumeLevelRef = useRef(DEFAULT_PLAYBACK_VOLUME_LEVEL);
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

  useEffect(() => {
    volumeLevelRef.current = volumeLevel;
  }, [volumeLevel]);

  useEffect(() => {
    if (!activePlayableItem) {
      return;
    }

    let isDisposed = false;

    const syncPlaybackVolumeLevel = async () => {
      try {
        await ensureSavedTrackPlayerReady();

        const currentVolumeLevel = normalizePlaybackVolumeLevel(
          await TrackPlayer.getVolume(),
        );

        if (isDisposed) {
          return;
        }

        volumeLevelRef.current = currentVolumeLevel;
        setVolumeLevel(currentVolumeLevel);
      } catch {
        if (isDisposed) {
          return;
        }

        volumeLevelRef.current = DEFAULT_PLAYBACK_VOLUME_LEVEL;
        setVolumeLevel(DEFAULT_PLAYBACK_VOLUME_LEVEL);
      }
    };

    void syncPlaybackVolumeLevel();

    return () => {
      isDisposed = true;
    };
  }, [activePlayableItem?.id, activePlayableItem?.playlistEntryId]);

  const playbackController = createSavedTrackPlaybackController({
    authState,
    activePlayableItemRef,
    activePlaylistSessionRef,
    isAdvancingPlaylistRef,
    isPreparing,
    playbackState,
    progressDurationSeconds: progress.duration,
    progressPositionSeconds: progress.position,
    setActivePlayableItem,
    setActivePlaylistSession,
    setIsPreparing,
    setIssue,
    setVolumeLevel,
    volumeLevelRef,
  });

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
          void playbackController.advancePlaylistPlayback();
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
          await playbackController.advancePlaylistPlayback();
          return;
        }

        await TrackPlayer.pause();
        await playbackController.seekActivePlayableItemTo(
          activePlayableItem,
          activePlayableItem.range.startMs / 1000,
        );
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

  return {
    activePlayableItem,
    activePlaylistSession,
    isPreparing,
    issue,
    playbackState,
    playlistRepeatMode,
    progress,
    resolveTrackDuration: playbackController.resolveTrackDuration,
    volumeLevel,
    setPlaylistRepeatMode(repeatMode: RepeatMode) {
      setPlaylistRepeatModeState(repeatMode);
      setActivePlaylistSession((currentSession) => {
        return currentSession
          ? updatePlaylistPlaybackRepeatMode(currentSession, repeatMode)
          : currentSession;
      });
    },
    async seekActivePlaybackBySeconds(deltaSeconds: number) {
      await playbackController.seekActivePlaybackBySeconds(deltaSeconds);
    },
    async seekActivePlaybackToPosition(positionSeconds: number) {
      await playbackController.seekActivePlaybackToPosition(positionSeconds);
    },
    async setPlaybackVolume(nextVolumeLevel: number) {
      await playbackController.setPlaybackVolume(nextVolumeLevel);
    },
    async toggleActivePlayback() {
      if (!activePlayableItemRef.current) {
        return;
      }

      await playbackController.togglePlayableItemPlayback(
        activePlayableItemRef.current,
      );
    },
    togglePlayableItemPlayback: playbackController.togglePlayableItemPlayback,
    async skipToNextItem() {
      await playbackController.playNextQueueItem();
    },
    async skipToPreviousItem() {
      await playbackController.playPreviousQueueItem();
    },
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
          nextSession.issue
            ? mapPlaylistPlaybackIssue(nextSession.issue)
            : null,
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
        if (await playbackController.loadPlayableItem(firstPlayableItem)) {
          setActivePlaylistSession(nextSession.session);
        }
      } catch (error) {
        setIssue(
          createSavedTrackPlaybackRuntimeIssue(firstPlayableItem, error),
        );
      } finally {
        setIsPreparing(false);
      }
    },
    async toggleSourcePlayback(source: DriveLibrarySource) {
      await playbackController.togglePlayableItemPlayback(
        createTrackPlayableItem(source),
      );
    },
  };
};
