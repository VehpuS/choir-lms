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
import {
  bindQueueToPlaylistPlaybackSession,
  rebuildPlaylistPlaybackSessionForMode,
  type ActivePlaylistContext,
} from '../../../playlists/utils/playlist-session-mode';
import {
  getPlaylistPlaybackCurrentItem,
  movePlaylistPlaybackQueueItem,
  movePlaylistPlaybackQueueItemToEnd,
  movePlaylistPlaybackQueueItemToStart,
  queuePlayableItemDuringPlayback,
  removePlaylistPlaybackQueueItem,
  selectPlaylistPlaybackQueueItem,
  updatePlaylistPlaybackRepeatMode,
  type PlaylistPlaybackSession,
} from '../../../playlists/utils/saved-playlist-playback-view-model';
import type { SavedTrackPlaybackController } from '../../utils/saved-track-playback-controller';
import {
  createSavedTrackPlaybackRuntimeIssue,
  hasPlayableItemChanged,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../../utils/saved-track-playback-view-model';
import { startItemQueuePlayback } from './item-queue-playback-actions';
import { startPlaylistPlayback } from './playlist-playback-actions';
import {
  hasSameQueuePosition,
  mapPlaylistPlaybackIssue,
  trackPlayerState,
} from './shared';

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
  setIsPreparing: Dispatch<SetStateAction<boolean>>;
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
    bindActiveQueueToPlaylist(options: {
      loops: NamedLoop[];
      playlist: Playlist;
      sources: DriveLibrarySource[];
    }) {
      const reboundSession = bindQueueToPlaylistPlaybackSession({
        playlist: options.playlist,
        session: activePlaylistSessionRef.current,
      });

      if (!reboundSession) {
        return false;
      }

      const reboundCurrentItem = getPlaylistPlaybackCurrentItem(reboundSession);

      activePlaylistContextRef.current = {
        loops: options.loops,
        playlist: options.playlist,
        sources: options.sources,
      };
      setActivePlaylistSession(reboundSession);

      if (
        hasPlayableItemChanged(
          activePlayableItemRef.current,
          reboundCurrentItem,
        )
      ) {
        setActivePlayableItem(reboundCurrentItem);
      }

      return true;
    },
    setPlaylistRepeatMode(repeatMode: RepeatMode) {
      setPlaylistRepeatModeState(repeatMode);
      setActivePlaylistSession((currentSession) => {
        return currentSession
          ? updatePlaylistPlaybackRepeatMode(currentSession, repeatMode)
          : currentSession;
      });
    },
    setPlaylistQueueMode(mode: RehearsalQueueMode) {
      setActivePlaylistSession((currentSession) => {
        const activePlaylistContext = activePlaylistContextRef.current;

        if (!currentSession || !activePlaylistContext) {
          return currentSession;
        }

        const nextSession = rebuildPlaylistPlaybackSessionForMode({
          loops: activePlaylistContext.loops,
          mode,
          playlist: activePlaylistContext.playlist,
          session: currentSession,
          sources: activePlaylistContext.sources,
        });

        if (nextSession.issue || !nextSession.session) {
          setIssue(
            nextSession.issue
              ? mapPlaylistPlaybackIssue(nextSession.issue)
              : null,
          );
          return currentSession;
        }

        return nextSession.session;
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
    queuePlayableItemNext(playableItem: PlayableItem) {
      setActivePlaylistSession((currentSession) => {
        return queuePlayableItemDuringPlayback({
          activePlayableItem: activePlayableItemRef.current,
          playableItem,
          position: 'next',
          repeatMode: repeatModeRef.current,
          session: currentSession,
        });
      });
    },
    queuePlayableItemUpNext(playableItem: PlayableItem) {
      setActivePlaylistSession((currentSession) => {
        return queuePlayableItemDuringPlayback({
          activePlayableItem: activePlayableItemRef.current,
          playableItem,
          position: 'up-next',
          repeatMode: repeatModeRef.current,
          session: currentSession,
        });
      });
    },
    moveQueueItem(fromIndex: number, toIndex: number) {
      setActivePlaylistSession((currentSession) => {
        return currentSession
          ? movePlaylistPlaybackQueueItem(currentSession, fromIndex, toIndex)
          : currentSession;
      });
    },
    moveQueueItemToEnd(index: number) {
      setActivePlaylistSession((currentSession) => {
        return currentSession
          ? movePlaylistPlaybackQueueItemToEnd(currentSession, index)
          : currentSession;
      });
    },
    moveQueueItemToStart(index: number) {
      setActivePlaylistSession((currentSession) => {
        return currentSession
          ? movePlaylistPlaybackQueueItemToStart(currentSession, index)
          : currentSession;
      });
    },
    removeQueueItem(index: number) {
      setActivePlaylistSession((currentSession) => {
        return currentSession
          ? removePlaylistPlaybackQueueItem(currentSession, index)
          : currentSession;
      });
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
      setIsPreparing(true);

      try {
        if (await playbackController.loadPlayableItem(selection.playableItem)) {
          setActivePlaylistSession(selection.nextSession);
        }
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
    async toggleItemQueuePlayback(items: PlayableItem[]) {
      if (await requestAuthorizationIfExpired()) {
        return;
      }

      await startItemQueuePlayback({
        activePlaylistContextRef,
        items,
        playbackController,
        repeatMode: playlistRepeatMode,
        setActivePlaylistSession,
        setIsPreparing,
        setIssue,
      });
    },
  };
};
