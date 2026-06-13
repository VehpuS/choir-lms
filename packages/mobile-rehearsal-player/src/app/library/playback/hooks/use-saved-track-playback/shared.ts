import {
  type NamedLoop,
  type PlayableItem,
  type Playlist,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../../drive/utils/drive-library-view-model';
import type { PlaylistPlaybackIssue } from '../../../playlists/utils/saved-playlist-playback-view-model';
import { type SavedTrackPlaybackIssue } from '../../utils/saved-track-playback-view-model';
import {
  getSavedTrackPlayerEventMap,
  getSavedTrackPlayerStateMap,
} from '../../utils/saved-track-player-interop';

export type SyncActivePlaylistContextOptions = {
  loops: NamedLoop[];
  playlists: Playlist[];
  sources: DriveLibrarySource[];
};

export const DEFAULT_PLAYBACK_VOLUME_LEVEL = 1;
export const trackPlayerEvent = getSavedTrackPlayerEventMap();
export const trackPlayerState = getSavedTrackPlayerStateMap();

export const mapPlaylistPlaybackIssue = (issue: PlaylistPlaybackIssue) => {
  return {
    message: issue.message,
    playlistId: issue.playlistId,
    title: issue.title,
  } satisfies SavedTrackPlaybackIssue;
};

export const hasSameQueuePosition = (
  activePlayableItem: PlayableItem | null,
  comparedPlayableItem: PlayableItem,
) => {
  if (!activePlayableItem) {
    return false;
  }

  const activeQueuePositionId =
    activePlayableItem.playlistEntryId ?? activePlayableItem.id;
  const comparedQueuePositionId =
    comparedPlayableItem.playlistEntryId ?? comparedPlayableItem.id;

  return activeQueuePositionId === comparedQueuePositionId;
};