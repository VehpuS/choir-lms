import {
  type PlayableItem,
  type RehearsalQueueMode,
  type RepeatMode,
} from '@org/audio-library-models';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { type ActivePlaylistContext } from '../../../playlists/utils/playlist-session-mode';
import {
  createTransientPlaybackSessionFromItems,
  getPlaylistPlaybackCurrentItem,
  type PlaylistPlaybackSession,
} from '../../../playlists/utils/saved-playlist-playback-view-model';
import { getPlaybackShapingSession } from '../../shaping';
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
  mode?: RehearsalQueueMode;
  playbackController: SavedTrackPlaybackController;
  repeatMode: RepeatMode;
  setActivePlaylistSession: Dispatch<
    SetStateAction<PlaylistPlaybackSession | null>
  >;
  setIsPreparing: (isPreparing: boolean) => void;
  setIssue: Dispatch<SetStateAction<SavedTrackPlaybackIssue | null>>;
};

export const startItemQueuePlayback = async (
  options: StartItemQueuePlaybackOptions,
) => {
  const nextSession = createTransientPlaybackSessionFromItems({
    items: options.items,
    mode: options.mode,
    repeatMode: options.repeatMode,
  });
  const firstPlayableItem = getPlaylistPlaybackCurrentItem(nextSession);

  if (!firstPlayableItem) {
    options.setActivePlaylistSession(null);
    options.setIssue(EMPTY_ITEM_QUEUE_ISSUE);
    return;
  }

  options.setIssue(null);

  if (!options.playbackController.canLoadPlayableItem(firstPlayableItem)) {
    return;
  }

  // The queue starts before its first item loads, so queue controls and Up
  // Next never wait on that item's download.
  options.activePlaylistContextRef.current = null;
  // Starting a queue is a new start: ambient shaping from before does not carry in.
  getPlaybackShapingSession().startNewPlayback();
  options.setActivePlaylistSession(nextSession);
  options.setIsPreparing(true);

  try {
    await options.playbackController.loadPlayableItem(firstPlayableItem);
  } catch (error) {
    options.setIssue(
      createSavedTrackPlaybackRuntimeIssue(firstPlayableItem, error),
    );
  } finally {
    options.setIsPreparing(false);
  }
};
