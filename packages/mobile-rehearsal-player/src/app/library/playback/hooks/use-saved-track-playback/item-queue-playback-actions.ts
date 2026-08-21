import { type PlayableItem, type RepeatMode } from '@org/audio-library-models';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { type ActivePlaylistContext } from '../../../playlists/utils/playlist-session-mode';
import {
  createTransientPlaybackSessionFromItems,
  getPlaylistPlaybackCurrentItem,
  type PlaylistPlaybackSession,
} from '../../../playlists/utils/saved-playlist-playback-view-model';
import type { SavedTrackPlaybackController } from '../../utils/saved-track-playback-controller';
import {
  createSavedTrackPlaybackRuntimeIssue,
  type SavedTrackPlaybackIssue,
} from '../../utils/saved-track-playback-view-model';

const EMPTY_ITEM_QUEUE_ISSUE: SavedTrackPlaybackIssue = {
  message:
    'This tag does not currently contain any playable saved tracks or loops.',
  title: 'Nothing to play',
};

type StartItemQueuePlaybackOptions = {
  activePlaylistContextRef: MutableRefObject<ActivePlaylistContext | null>;
  items: PlayableItem[];
  playbackController: SavedTrackPlaybackController;
  repeatMode: RepeatMode;
  setActivePlaylistSession: Dispatch<
    SetStateAction<PlaylistPlaybackSession | null>
  >;
  setIsPreparing: Dispatch<SetStateAction<boolean>>;
  setIssue: Dispatch<SetStateAction<SavedTrackPlaybackIssue | null>>;
};

export const startItemQueuePlayback = async (
  options: StartItemQueuePlaybackOptions,
) => {
  const nextSession = createTransientPlaybackSessionFromItems({
    items: options.items,
    repeatMode: options.repeatMode,
  });
  const firstPlayableItem = getPlaylistPlaybackCurrentItem(nextSession);

  if (!firstPlayableItem) {
    options.setActivePlaylistSession(null);
    options.setIssue(EMPTY_ITEM_QUEUE_ISSUE);
    return;
  }

  options.setIssue(null);
  options.setIsPreparing(true);

  try {
    if (await options.playbackController.loadPlayableItem(firstPlayableItem)) {
      options.activePlaylistContextRef.current = null;
      options.setActivePlaylistSession(nextSession);
    }
  } catch (error) {
    options.setIssue(
      createSavedTrackPlaybackRuntimeIssue(firstPlayableItem, error),
    );
  } finally {
    options.setIsPreparing(false);
  }
};
