import {
  type NamedLoop,
  type PlayableItem,
  type Playlist,
  type RehearsalQueueMode,
  type RepeatMode,
} from '@org/audio-library-models';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { DriveLibrarySource } from '../../../drive/utils/drive-library-view-model';
import {
  bindQueueToPlaylistPlaybackSession,
  type ActivePlaylistContext,
} from '../../../playlists/utils/playlist-session-mode';
import { rebuildQueueSessionForMode } from '../../../playlists/utils/queue-session-mode';
import {
  getPlaylistPlaybackCurrentItem,
  movePlaylistPlaybackQueueItem,
  movePlaylistPlaybackQueueItemToEnd,
  movePlaylistPlaybackQueueItemToStart,
  queuePlayableItemsDuringPlayback,
  removePlaylistPlaybackQueueItem,
  updatePlaylistPlaybackRepeatMode,
  type PlaylistPlaybackSession,
} from '../../../playlists/utils/saved-playlist-playback-view-model';
import { hasPlayableItemChanged } from '../../utils/saved-track-playback-view-model';

type CreateSavedTrackQueueEditActionsOptions = {
  activePlayableItemRef: MutableRefObject<PlayableItem | null>;
  activePlaylistContextRef: MutableRefObject<ActivePlaylistContext | null>;
  activePlaylistSessionRef: MutableRefObject<PlaylistPlaybackSession | null>;
  repeatModeRef: MutableRefObject<RepeatMode>;
  setActivePlayableItem: Dispatch<SetStateAction<PlayableItem | null>>;
  setActivePlaylistSession: Dispatch<
    SetStateAction<PlaylistPlaybackSession | null>
  >;
  setPlaylistRepeatModeState: Dispatch<SetStateAction<RepeatMode>>;
};

// The edits that change the queue or its modes without touching the player:
// queueing, reordering, removing, rebinding to a playlist, repeat and order.
export const createSavedTrackQueueEditActions = ({
  activePlayableItemRef,
  activePlaylistContextRef,
  activePlaylistSessionRef,
  repeatModeRef,
  setActivePlayableItem,
  setActivePlaylistSession,
  setPlaylistRepeatModeState,
}: CreateSavedTrackQueueEditActionsOptions) => {
  const queuePlayableItems = (
    playableItems: readonly PlayableItem[],
    position: 'next' | 'up-next',
  ) => {
    if (playableItems.length === 0) {
      return;
    }

    setActivePlaylistSession((currentSession) => {
      return queuePlayableItemsDuringPlayback({
        activePlayableItem: activePlayableItemRef.current,
        playableItems,
        position,
        repeatMode: repeatModeRef.current,
        session: currentSession,
      });
    });
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
        return currentSession
          ? rebuildQueueSessionForMode({ mode, session: currentSession })
          : currentSession;
      });
    },
    queuePlayableItemNext(playableItem: PlayableItem) {
      queuePlayableItems([playableItem], 'next');
    },
    queuePlayableItemUpNext(playableItem: PlayableItem) {
      queuePlayableItems([playableItem], 'up-next');
    },
    // Bulk selection: the whole block goes in as one ordered insertion, so
    // the current item is never interrupted (design Decision 10).
    queuePlayableItemsNext(playableItems: readonly PlayableItem[]) {
      queuePlayableItems(playableItems, 'next');
    },
    queuePlayableItemsUpNext(playableItems: readonly PlayableItem[]) {
      queuePlayableItems(playableItems, 'up-next');
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
  };
};
