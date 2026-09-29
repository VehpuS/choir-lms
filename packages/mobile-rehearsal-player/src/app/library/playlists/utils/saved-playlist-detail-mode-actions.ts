import type { Playlist, RehearsalQueueMode } from '@org/audio-library-models';

import type { OutlinedActionButtonVariant } from '../../../components/outlined-action-button/model';
import type { SavedTrackPlaybackState } from '../../playback/utils/saved-track-playback-view-model';
import {
  getBaseActionLabel,
  getPlaylistPlaybackActionCopy,
  getPlaylistQueueModeLabel,
  type PlaylistPlaybackSession,
} from './saved-playlist-playback-view-model';

export type PlaylistDetailModeControlIcon = 'play' | 'play-outline' | 'shuffle';

export type PlaylistDetailModeControlAction = {
  accessibilityLabel: string;
  disabled: boolean;
  icon: PlaylistDetailModeControlIcon;
  label: string;
  mode: RehearsalQueueMode;
  selected: boolean;
  variant: Extract<OutlinedActionButtonVariant, 'accent' | 'neutral'>;
};

const PLAYLIST_DETAIL_MODES: RehearsalQueueMode[] = ['ordered', 'shuffle'];

// With nothing running, ordered play is the primary action (screen 1c's
// `Play all`); once a mode runs, the accent follows it.
const DEFAULT_PRIMARY_MODE: RehearsalQueueMode = 'ordered';

const getPlaylistDetailModeIcon = (
  mode: RehearsalQueueMode,
  isPrimary: boolean,
): PlaylistDetailModeControlIcon => {
  if (mode === 'shuffle') {
    return 'shuffle';
  }

  return isPrimary ? 'play' : 'play-outline';
};

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
  const isSessionForPlaylist =
    options.activeSession !== null &&
    options.activeSession.playlistId === options.selectedPlaylist?.id;
  const runningMode = isSessionForPlaylist
    ? (options.activeSession?.queue.mode ?? null)
    : null;
  const primaryMode = runningMode ?? DEFAULT_PRIMARY_MODE;

  return PLAYLIST_DETAIL_MODES.map((mode) => {
    const actionCopy = getPlaylistPlaybackActionCopy({ ...options, mode });
    const isPrimary = mode === primaryMode;

    return {
      accessibilityLabel: getBaseActionLabel(mode),
      disabled: actionCopy.disabled,
      icon: getPlaylistDetailModeIcon(mode, isPrimary),
      label: getPlaylistQueueModeLabel(mode),
      mode,
      selected: mode === runningMode,
      variant: isPrimary ? 'accent' : 'neutral',
    };
  });
};
