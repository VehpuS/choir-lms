import type { Playlist, RehearsalQueueMode } from '@org/audio-library-models';

import type { SavedTrackPlaybackState } from '../../playback/utils/saved-track-playback-view-model';
import {
  getBaseActionLabel,
  getPlaylistPlaybackActionCopy,
  getPlaylistQueueModeLabel,
  type PlaylistPlaybackSession,
} from './saved-playlist-playback-view-model';

export type PlaylistDetailModeControlIcon = 'play' | 'shuffle';

export type PlaylistDetailModeControlAction = {
  accessibilityLabel: string;
  disabled: boolean;
  icon: PlaylistDetailModeControlIcon;
  label: string;
  mode: RehearsalQueueMode;
  selected: boolean;
};

const PLAYLIST_DETAIL_MODE_ICONS: Record<
  RehearsalQueueMode,
  PlaylistDetailModeControlIcon
> = {
  ordered: 'play',
  shuffle: 'shuffle',
};

const PLAYLIST_DETAIL_MODES: RehearsalQueueMode[] = ['ordered', 'shuffle'];

// Icon-first ordered/shuffle actions for playlist detail's own control row
// (mobile-rehearsal-player-usability: "Playlist detail fresh-start playback
// uses icon-first ordered and shuffle actions"). Deliberately does not reuse
// getPlaylistPlaybackActionCopy's label text as visible copy: that text
// ("Play ordered", "Shuffle play") is the button copy the same spec forbids
// rendering in this control row.
export const getPlaylistDetailModeActions = (options: {
  activeSession: PlaylistPlaybackSession | null;
  isPreparing: boolean;
  playbackState: SavedTrackPlaybackState | undefined;
  selectedPlaylist: Playlist | null;
}): PlaylistDetailModeControlAction[] => {
  return PLAYLIST_DETAIL_MODES.map((mode) => {
    const actionCopy = getPlaylistPlaybackActionCopy({ ...options, mode });
    const selected =
      options.activeSession?.playlistId === options.selectedPlaylist?.id &&
      options.activeSession?.queue.mode === mode;

    return {
      accessibilityLabel: getBaseActionLabel(mode),
      disabled: actionCopy.disabled,
      icon: PLAYLIST_DETAIL_MODE_ICONS[mode],
      label: getPlaylistQueueModeLabel(mode),
      mode,
      selected,
    };
  });
};
