import {
  createTrackPlayableItem,
  type NamedLoop,
  type PlayableItem,
  type Playlist,
  type RehearsalQueueMode,
  type RepeatMode,
} from '@org/audio-library-models';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { DriveLibrarySource } from '../../../drive/utils/drive-library-view-model';
import {
  rebuildPlaylistPlaybackSessionForMode,
  type ActivePlaylistContext,
} from '../../../playlists/utils/playlist-session-mode';
import {
  buildPlaylistPlaybackSession,
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
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../../utils/saved-track-playback-view-model';
import {
  hasSameQueuePosition,
  mapPlaylistPlaybackIssue,
  trackPlayerState,
} from './shared';

type CreateSavedTrackPlaybackActionsOptions = {
  activePlayableItemRef: MutableRefObject<PlayableItem | null>;
  activePlaylistContextRef: MutableRefObject<ActivePlaylistContext | null>;
  activePlaylistSessionRef: MutableRefObject<PlaylistPlaybackSession | null>;
  playbackController: SavedTrackPlaybackController;
  playbackState: SavedTrackPlaybackState | undefined;
  playlistRepeatMode: RepeatMode;
  repeatModeRef: MutableRefObject<RepeatMode>;
  setActivePlaylistSession: Dispatch<
    SetStateAction<PlaylistPlaybackSession | null>
  >;
  setIsPreparing: Dispatch<SetStateAction<boolean>>;
  setIssue: Dispatch<SetStateAction<SavedTrackPlaybackIssue | null>>;
  setPlaylistRepeatModeState: Dispatch<SetStateAction<RepeatMode>>;
};

export const createSavedTrackPlaybackActions = ({
  activePlayableItemRef,
  activePlaylistContextRef,
  activePlaylistSessionRef,
  playbackController,
  playbackState,
  playlistRepeatMode,
  repeatModeRef,
  setActivePlaylistSession,
  setIsPreparing,
  setIssue,
  setPlaylistRepeatModeState,
}: CreateSavedTrackPlaybackActionsOptions) => {
  return {
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
      activePlaylistContextRef.current = null;
      await playbackController.togglePlayableItemPlayback(playableItem);
    },
    async playPlayableItem(playableItem: PlayableItem) {
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
      startEntryId?: string;
    }) {
      const nextSession = buildPlaylistPlaybackSession({
        loops: options.loops,
        mode: options.mode,
        playlist: options.playlist,
        repeatMode: playlistRepeatMode,
        sources: options.sources,
        startEntryId: options.startEntryId,
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
          activePlaylistContextRef.current = {
            loops: options.loops,
            playlist: options.playlist,
            sources: options.sources,
          };
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
      activePlaylistContextRef.current = null;
      await playbackController.togglePlayableItemPlayback(
        createTrackPlayableItem(source),
      );
    },
  };
};