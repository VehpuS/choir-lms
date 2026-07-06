import { type PlayableItem, type RepeatMode } from '@org/audio-library-models';
import { type DriveAuthorizationState } from '@org/google-drive';
import type { Dispatch, SetStateAction } from 'react';
import { useRef, useState } from 'react';

import { isDriveAuthorizationFailure } from '../../../../auth/google-drive/utils/authorization';
import { type ActivePlaylistContext } from '../../../playlists/utils/playlist-session-mode';
import { type PlaylistPlaybackSession } from '../../../playlists/utils/saved-playlist-playback-view-model';
import { createSavedTrackPlaybackController } from '../../utils/saved-track-playback-controller';
import { createSavedTrackPlaybackControllerOptionsProxy } from '../../utils/saved-track-playback-controller/shared';
import {
  createSavedTrackPlaybackAuthorizationIssue,
  type SavedTrackPlaybackIssue,
} from '../../utils/saved-track-playback-view-model';
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

export const useSavedTrackPlayback = (
  authState: DriveAuthorizationState,
  onAuthorizationExpired?: () => void,
  onAuthorizationRequired?: () => Promise<void> | void,
) => {
  const [activePlayableItem, setActivePlayableItem] =
    useState<PlayableItem | null>(null);
  const [activePlaylistSession, setActivePlaylistSession] =
    useState<PlaylistPlaybackSession | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [issue, setIssueState] = useState<SavedTrackPlaybackIssue | null>(null);
  const [playlistRepeatMode, setPlaylistRepeatModeState] =
    useState<RepeatMode>('off');
  const [volumeLevel, setVolumeLevel] = useState(DEFAULT_PLAYBACK_VOLUME_LEVEL);
  const activePlayableItemRef = useRef<PlayableItem | null>(null);
  const activePlaylistContextRef = useRef<ActivePlaylistContext | null>(null);
  const activePlaylistSessionRef = useRef<PlaylistPlaybackSession | null>(null);
  const isAdvancingPlaylistRef = useRef(false);
  const issueRef = useRef<SavedTrackPlaybackIssue | null>(null);
  const onAuthorizationExpiredRef = useRef(onAuthorizationExpired);
  const playbackControllerRef = useRef<ReturnType<
    typeof createSavedTrackPlaybackController
  > | null>(null);
  const setIssueRef = useRef<Dispatch<
    SetStateAction<SavedTrackPlaybackIssue | null>
  > | null>(null);
  const syncActivePlaylistContextRef = useRef<
    ((options: SyncActivePlaylistContextOptions) => void) | null
  >(null);
  const volumeLevelRef = useRef(DEFAULT_PLAYBACK_VOLUME_LEVEL);
  const repeatModeRef = useRef<RepeatMode>('off');
  const playbackState = useSavedTrackPlayerPlaybackState().state;
  const progress = useSavedTrackPlayerProgress(500);

  onAuthorizationExpiredRef.current = onAuthorizationExpired;
  issueRef.current = issue;

  if (!setIssueRef.current) {
    setIssueRef.current = (nextIssue) => {
      const resolvedIssue =
        typeof nextIssue === 'function'
          ? nextIssue(issueRef.current)
          : nextIssue;

      if (resolvedIssue && isDriveAuthorizationFailure(resolvedIssue.message)) {
        const authorizationIssue =
          createSavedTrackPlaybackAuthorizationIssue(resolvedIssue);

        issueRef.current = authorizationIssue;
        onAuthorizationExpiredRef.current?.();
        setIssueState(authorizationIssue);
        return;
      }

      issueRef.current = resolvedIssue;
      setIssueState(resolvedIssue);
    };
  }

  const setIssue = setIssueRef.current;
  const playbackControllerOptionsRef = useRef({
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

  playbackControllerOptionsRef.current = {
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
  };

  if (!playbackControllerRef.current) {
    playbackControllerRef.current = createSavedTrackPlaybackController(
      createSavedTrackPlaybackControllerOptionsProxy(
        playbackControllerOptionsRef,
      ),
    );
  }

  const playbackController = playbackControllerRef.current;

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
    playbackStateRef: playbackControllerOptionsRef,
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
    authState,
    activePlayableItemRef,
    activePlaylistContextRef,
    activePlaylistSessionRef,
    playbackController,
    playbackState,
    playlistRepeatMode,
    requestAuthorization: onAuthorizationRequired,
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
