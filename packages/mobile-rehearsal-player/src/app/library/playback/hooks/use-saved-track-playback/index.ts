import { type PlayableItem, type RepeatMode } from '@org/audio-library-models';
import { type DriveAuthorizationState } from '@org/google-drive';
import { useRef, useState } from 'react';

import { type ActivePlaylistContext } from '../../../playlists/utils/playlist-session-mode';
import { type PlaylistPlaybackSession } from '../../../playlists/utils/saved-playlist-playback-view-model';
import { createSavedTrackPlaybackController } from '../../utils/saved-track-playback-controller';
import type { SavedTrackPlaybackIssue } from '../../utils/saved-track-playback-view-model';
import {
  useSavedTrackPlayerPlaybackState,
  useSavedTrackPlayerProgress,
} from '../../utils/saved-track-player-interop';
import { createSavedTrackPlaybackActions } from './actions';
import { useSavedTrackPlaybackEffects } from './effects';
import {
  DEFAULT_PLAYBACK_VOLUME_LEVEL,
  type SyncActivePlaylistContextOptions,
} from './shared';
import { createSyncActivePlaylistContext } from './sync-playlist-context';

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
  const activePlaylistContextRef = useRef<ActivePlaylistContext | null>(null);
  const activePlaylistSessionRef = useRef<PlaylistPlaybackSession | null>(null);
  const isAdvancingPlaylistRef = useRef(false);
  const playbackControllerRef = useRef<ReturnType<
    typeof createSavedTrackPlaybackController
  > | null>(null);
  const syncActivePlaylistContextRef = useRef<
    ((options: SyncActivePlaylistContextOptions) => void) | null
  >(null);
  const volumeLevelRef = useRef(DEFAULT_PLAYBACK_VOLUME_LEVEL);
  const repeatModeRef = useRef<RepeatMode>('off');
  const playbackState = useSavedTrackPlayerPlaybackState().state;
  const progress = useSavedTrackPlayerProgress(500);

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

  playbackControllerRef.current = playbackController;

  if (!syncActivePlaylistContextRef.current) {
    syncActivePlaylistContextRef.current = createSyncActivePlaylistContext({
      activePlayableItemRef,
      activePlaylistContextRef,
      activePlaylistSessionRef,
      playbackControllerRef,
      setActivePlayableItem,
      setActivePlaylistSession,
      setIssue,
    });
  }

  useSavedTrackPlaybackEffects({
    activePlayableItem,
    activePlayableItemRef,
    activePlaylistSession,
    activePlaylistSessionRef,
    playbackController,
    playbackState,
    playlistRepeatMode,
    progressDurationSeconds: progress.duration,
    progressPositionSeconds: progress.position,
    repeatModeRef,
    setActivePlayableItem,
    setIsPreparing,
    setIssue,
    setVolumeLevel,
    volumeLevel,
    volumeLevelRef,
  });

  const actions = createSavedTrackPlaybackActions({
    activePlayableItemRef,
    activePlaylistContextRef,
    activePlaylistSessionRef,
    playbackController,
    playbackState,
    playlistRepeatMode,
    repeatModeRef,
    setActivePlayableItem,
    setActivePlaylistSession,
    setIsPreparing,
    setIssue,
    setPlaylistRepeatModeState,
  });

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
    syncActivePlaylistContext: syncActivePlaylistContextRef.current,
    ...actions,
  };
};
