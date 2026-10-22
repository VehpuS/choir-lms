import {
  createTrackPlayableItem,
  type NamedLoop,
  type PlayableItem,
  type Playlist,
  type RehearsalQueueMode,
  type RepeatMode,
} from '@org/audio-library-models';
import type { DriveAuthorizationState } from '@org/google-drive';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { DriveLibrarySource } from '../../../drive/utils/drive-library-view-model';
import { type ActivePlaylistContext } from '../../../playlists/utils/playlist-session-mode';
import {
  selectPlaylistPlaybackQueueItem,
  type PlaylistPlaybackSession,
} from '../../../playlists/utils/saved-playlist-playback-view-model';
import type { SavedTrackPlaybackController } from '../../utils/saved-track-playback-controller';
import {
  createSavedTrackPlaybackRuntimeIssue,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../../utils/saved-track-playback-view-model';
import { createSavedTrackQueueEditActions } from './queue-edit-actions';
import { startItemQueuePlayback } from './item-queue-playback-actions';
import { startPlaylistPlayback } from './playlist-playback-actions';
import { hasSameQueuePosition, trackPlayerState } from './shared';

type CreateSavedTrackPlaybackActionsOptions = {
  authState: DriveAuthorizationState;
  activePlayableItemRef: MutableRefObject<PlayableItem | null>;
  activePlaylistContextRef: MutableRefObject<ActivePlaylistContext | null>;
  activePlaylistSessionRef: MutableRefObject<PlaylistPlaybackSession | null>;
  playbackController: SavedTrackPlaybackController;
  playbackState: SavedTrackPlaybackState | undefined;
  playlistRepeatMode: RepeatMode;
  requestAuthorization?: () => Promise<void> | void;
  repeatModeRef: MutableRefObject<RepeatMode>;
  setActivePlayableItem: Dispatch<SetStateAction<PlayableItem | null>>;
  setActivePlaylistSession: Dispatch<
    SetStateAction<PlaylistPlaybackSession | null>
  >;
  setIsPreparing: (isPreparing: boolean) => void;
  setIssue: Dispatch<SetStateAction<SavedTrackPlaybackIssue | null>>;
  setPlaylistRepeatModeState: Dispatch<SetStateAction<RepeatMode>>;
};

export const createSavedTrackPlaybackActions = ({
  authState,
  activePlayableItemRef,
  activePlaylistContextRef,
  activePlaylistSessionRef,
  playbackController,
  playbackState,
  playlistRepeatMode,
  requestAuthorization,
  repeatModeRef,
  setActivePlayableItem,
  setActivePlaylistSession,
  setIsPreparing,
  setIssue,
  setPlaylistRepeatModeState,
}: CreateSavedTrackPlaybackActionsOptions) => {
  const requestAuthorizationIfExpired = async () => {
    if (authState.status !== 'expired') {
      return false;
    }

    setIssue(null);
    await requestAuthorization?.();

    return true;
  };

  return {
    ...createSavedTrackQueueEditActions({
      activePlayableItemRef,
      activePlaylistContextRef,
      activePlaylistSessionRef,
      repeatModeRef,
      setActivePlayableItem,
      setActivePlaylistSession,
      setPlaylistRepeatModeState,
    }),
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
      if (await requestAuthorizationIfExpired()) {
        return;
      }

      if (!activePlayableItemRef.current) {
        return;
      }

      await playbackController.togglePlayableItemPlayback(
        activePlayableItemRef.current,
      );
    },
    async pauseActivePlayback() {
      return playbackController.pauseActivePlayback();
    },
    async togglePlayableItemPlayback(playableItem: PlayableItem) {
      if (await requestAuthorizationIfExpired()) {
        return;
      }

      activePlaylistContextRef.current = null;
      await playbackController.togglePlayableItemPlayback(playableItem);
    },
    /** Seeks the loaded item or loads `target` at the marker; see `planMarkerJump`. */
    async jumpToMarker(target: PlayableItem, positionMs: number) {
      if (await requestAuthorizationIfExpired()) {
        return 'blocked' as const;
      }

      activePlaylistContextRef.current = null;

      return playbackController.jumpToMarker(target, positionMs);
    },
    async playPlayableItem(playableItem: PlayableItem) {
      if (await requestAuthorizationIfExpired()) {
        return;
      }

      activePlaylistContextRef.current = null;

      if (
        activePlayableItemRef.current?.id === playableItem.id &&
        playbackState === trackPlayerState.Playing
      ) {
        return;
      }

      await playbackController.togglePlayableItemPlayback(playableItem);
    },
    async playQueueItem(index: number) {
      if (await requestAuthorizationIfExpired()) {
        return;
      }

      const currentSession = activePlaylistSessionRef.current;

      if (!currentSession) {
        return;
      }

      const selection = selectPlaylistPlaybackQueueItem(currentSession, index);

      if (!selection.playableItem) {
        return;
      }

      if (
        hasSameQueuePosition(
          activePlayableItemRef.current,
          selection.playableItem,
        )
      ) {
        setActivePlaylistSession(selection.nextSession);
        await playbackController.playActivePlayback();
        return;
      }

      setIssue(null);

      if (!playbackController.canLoadPlayableItem(selection.playableItem)) {
        return;
      }

      setActivePlaylistSession(selection.nextSession);
      setIsPreparing(true);

      try {
        await playbackController.loadPlayableItem(selection.playableItem);
      } catch (error) {
        setIssue(
          createSavedTrackPlaybackRuntimeIssue(selection.playableItem, error),
        );
      } finally {
        setIsPreparing(false);
      }
    },
    async skipToNextItem() {
      if (await requestAuthorizationIfExpired()) {
        return;
      }

      await playbackController.playNextQueueItem();
    },
    async skipToPreviousItem() {
      if (await requestAuthorizationIfExpired()) {
        return;
      }

      await playbackController.playPreviousQueueItem();
    },
    async togglePlaylistPlayback(options: {
      loops: NamedLoop[];
      mode: RehearsalQueueMode;
      playlist: Playlist;
      sources: DriveLibrarySource[];
      startEntryId?: string;
    }) {
      if (await requestAuthorizationIfExpired()) {
        return;
      }

      await startPlaylistPlayback({
        activePlaylistContextRef,
        loops: options.loops,
        mode: options.mode,
        playbackController,
        playlist: options.playlist,
        playlistRepeatMode,
        setActivePlaylistSession,
        setIsPreparing,
        setIssue,
        sources: options.sources,
        startEntryId: options.startEntryId,
      });
    },
    async toggleSourcePlayback(source: DriveLibrarySource) {
      if (await requestAuthorizationIfExpired()) {
        return;
      }

      activePlaylistContextRef.current = null;
      await playbackController.togglePlayableItemPlayback(
        createTrackPlayableItem(source),
      );
    },
    async toggleItemQueuePlayback(
      items: PlayableItem[],
      queueOptions?: { mode?: RehearsalQueueMode },
    ) {
      if (await requestAuthorizationIfExpired()) {
        return;
      }

      await startItemQueuePlayback({
        activePlaylistContextRef,
        items,
        mode: queueOptions?.mode,
        playbackController,
        repeatMode: playlistRepeatMode,
        setActivePlaylistSession,
        setIsPreparing,
        setIssue,
      });
    },
  };
};
