import type { PlayableItem } from '@org/audio-library-models';
import { type DriveAuthorizationState } from '@org/google-drive';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { PlaylistPlaybackSession } from '../../../playlists/utils/saved-playlist-playback-view-model';
import type {
  SavedTrackPlaybackIssue,
  SavedTrackPlaybackState,
} from '../saved-track-playback-view-model';
import { getSavedTrackPlayerStateMap } from '../saved-track-player-interop';

export const trackPlayerState = getSavedTrackPlayerStateMap();

export type SavedTrackPlaybackControllerOptions = {
  authState: DriveAuthorizationState;
  activePlayableItemRef: MutableRefObject<PlayableItem | null>;
  activePlaylistSessionRef: MutableRefObject<PlaylistPlaybackSession | null>;
  isAdvancingPlaylistRef: MutableRefObject<boolean>;
  isPreparing: boolean;
  playbackState: SavedTrackPlaybackState | undefined;
  progressDurationSeconds: number;
  progressPositionSeconds: number;
  setActivePlayableItem: Dispatch<SetStateAction<PlayableItem | null>>;
  setActivePlaylistSession: Dispatch<
    SetStateAction<PlaylistPlaybackSession | null>
  >;
  setIsPreparing: Dispatch<SetStateAction<boolean>>;
  setIssue: Dispatch<SetStateAction<SavedTrackPlaybackIssue | null>>;
  setVolumeLevel: Dispatch<SetStateAction<number>>;
  volumeLevelRef: MutableRefObject<number>;
};

export const isActivePlaybackSource = (
  activePlayableItem: PlayableItem | null,
  playableItem: PlayableItem,
) => {
  return activePlayableItem?.id === playableItem.id;
};

export const isSameQueuePosition = (
  activePlayableItem: PlayableItem,
  comparedPlayableItem: PlayableItem,
) => {
  const activeQueuePositionId =
    activePlayableItem.playlistEntryId ?? activePlayableItem.id;
  const comparedQueuePositionId =
    comparedPlayableItem.playlistEntryId ?? comparedPlayableItem.id;

  return activeQueuePositionId === comparedQueuePositionId;
};

export const canResumeSavedTrackPlayback = (
  playbackState: SavedTrackPlaybackState | undefined,
) => {
  return (
    playbackState !== undefined &&
    playbackState !== trackPlayerState.Error &&
    playbackState !== trackPlayerState.None
  );
};