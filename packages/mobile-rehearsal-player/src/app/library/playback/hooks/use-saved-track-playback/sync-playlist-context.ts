import { type PlayableItem } from '@org/audio-library-models';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import {
  syncActivePlaylistPlaybackSession,
  type ActivePlaylistContext,
} from '../../../playlists/utils/playlist-session-mode';
import {
  getPlaylistPlaybackCurrentItem,
  type PlaylistPlaybackSession,
} from '../../../playlists/utils/saved-playlist-playback-view-model';
import type { SavedTrackPlaybackController } from '../../utils/saved-track-playback-controller';
import {
  hasPlayableItemChanged,
  resolveSynchronizedPlayableItem,
  type SavedTrackPlaybackIssue,
} from '../../utils/saved-track-playback-view-model';
import {
  hasSameQueuePosition,
  mapPlaylistPlaybackIssue,
  type SyncActivePlaylistContextOptions,
} from './shared';

type CreateSyncActivePlaylistContextOptions = {
  activePlayableItemRef: MutableRefObject<PlayableItem | null>;
  activePlaylistContextRef: MutableRefObject<ActivePlaylistContext | null>;
  activePlaylistSessionRef: MutableRefObject<PlaylistPlaybackSession | null>;
  playbackControllerRef: MutableRefObject<SavedTrackPlaybackController | null>;
  setActivePlayableItem: Dispatch<SetStateAction<PlayableItem | null>>;
  setActivePlaylistSession: Dispatch<
    SetStateAction<PlaylistPlaybackSession | null>
  >;
  setIssue: Dispatch<SetStateAction<SavedTrackPlaybackIssue | null>>;
};

export const createSyncActivePlaylistContext = (
  options: CreateSyncActivePlaylistContextOptions,
) => {
  return (syncOptions: SyncActivePlaylistContextOptions) => {
    const syncResult = syncActivePlaylistPlaybackSession({
      currentContext: options.activePlaylistContextRef.current,
      loops: syncOptions.loops,
      playlists: syncOptions.playlists,
      session: options.activePlaylistSessionRef.current,
      sources: syncOptions.sources,
    });

    options.activePlaylistContextRef.current = syncResult.context;

    if (syncResult.issue) {
      options.setIssue(mapPlaylistPlaybackIssue(syncResult.issue));
    }

    if (syncResult.session) {
      options.setActivePlaylistSession(syncResult.session);
    }

    const currentPlayableItem = options.activePlayableItemRef.current;

    if (!currentPlayableItem) {
      return;
    }

    const rebuiltCurrentItem = syncResult.session
      ? getPlaylistPlaybackCurrentItem(syncResult.session)
      : null;
    const nextActivePlayableItem =
      rebuiltCurrentItem &&
      hasSameQueuePosition(currentPlayableItem, rebuiltCurrentItem)
        ? rebuiltCurrentItem
        : resolveSynchronizedPlayableItem({
            loops: syncOptions.loops,
            playableItem: currentPlayableItem,
            sources: syncOptions.sources,
          });

    if (!hasPlayableItemChanged(currentPlayableItem, nextActivePlayableItem)) {
      return;
    }

    options.setActivePlayableItem(nextActivePlayableItem);

    if (nextActivePlayableItem) {
      void options.playbackControllerRef.current?.syncActivePlayableItem(
        nextActivePlayableItem,
      );
    }
  };
};
