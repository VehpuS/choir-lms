import {
  createTrackPlayableItem,
  type PlayableItem,
  type Playlist,
} from '@org/audio-library-models';

import type { AppIconName } from '../../../components/app-icon/model';
import { ROW_META_SEPARATOR } from '../../../components/row-meta-line/model';
import {
  getSavedTrackPlaybackActionCopy,
  type SavedTrackPlaybackState,
} from '../../playback/utils/saved-track-playback-view-model';
import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';

/** Playback state and handlers the Files rows need for their play rings. */
export type FilesViewPlayback = {
  isPreparing: boolean;
  onStartPlaylist: (playlist: Playlist) => void;
  onToggleActivePlayback: () => void;
  state: SavedTrackPlaybackState | undefined;
};

export type FilesRowPlaybackRing = {
  accessibilityLabel: string;
  disabled: boolean;
  iconName: 'pause' | 'play';
  onPress: () => void;
};

export type FilesRowPlaybackPresentation = {
  isActive: boolean;
  isPlaying: boolean;
  leadingIconName: AppIconName;
  playbackRing?: FilesRowPlaybackRing;
};

const PLAYING_META_LABEL = 'Playing';
const PAUSE_LABEL = 'Pause';

const KIND_ICONS: Record<LibraryFilesRow['kind'], AppIconName> = {
  folder: 'folder-outline',
  loop: 'repeat',
  playlist: 'playlist-music-outline',
  track: 'music-note-outline',
};

const getRowPlayableItem = (row: LibraryFilesRow): PlayableItem | null => {
  if (row.kind === 'track') {
    return row.isPlayable ? createTrackPlayableItem(row.source) : null;
  }

  return row.kind === 'loop' ? row.playableItem : null;
};

const isPlaylistActive = (
  activePlayableItem: PlayableItem | null,
  playlist: Playlist,
) => {
  return activePlayableItem?.playlistId === playlist.id;
};

const resolvePlaylistPresentation = (options: {
  activePlayableItem: PlayableItem | null;
  playback: FilesViewPlayback;
  playlist: Playlist;
  rowLabel: string;
}): FilesRowPlaybackPresentation => {
  const isActive = isPlaylistActive(
    options.activePlayableItem,
    options.playlist,
  );
  const isPlaying = isActive && options.playback.state === 'playing';
  const actionLabel = isPlaying ? PAUSE_LABEL : isActive ? 'Resume' : 'Play';

  return {
    isActive,
    isPlaying,
    leadingIconName: KIND_ICONS.playlist,
    playbackRing: {
      accessibilityLabel: `${actionLabel} ${options.rowLabel}`,
      disabled:
        options.playback.isPreparing || options.playlist.items.length === 0,
      iconName: isPlaying ? 'pause' : 'play',
      // The row tap opens the playlist; its ring plays it in order, or
      // pauses / resumes it once it is the active session.
      onPress: isActive
        ? options.playback.onToggleActivePlayback
        : () => {
            options.playback.onStartPlaylist(options.playlist);
          },
    },
  };
};

/**
 * How a Files row shows playback (screen 1b): every playable row gets a play
 * ring that turns into `pause` while that row plays, and the active row is
 * flagged so the list can color its glyph and title. Folders have no ring.
 */
export const resolveFilesRowPlaybackPresentation = (options: {
  activePlayableItem: PlayableItem | null;
  isActive: boolean;
  onToggle: () => void;
  playback: FilesViewPlayback;
  row: LibraryFilesRow;
}): FilesRowPlaybackPresentation => {
  const { row } = options;

  if (row.kind === 'playlist') {
    return resolvePlaylistPresentation({
      activePlayableItem: options.activePlayableItem,
      playback: options.playback,
      playlist: row.playlist,
      rowLabel: row.label,
    });
  }

  const playableItem = getRowPlayableItem(row);
  const isPlaying = options.isActive && options.playback.state === 'playing';
  // Rows keep their entity-type glyph even while playing (the Files row
  // contract in `mobile-library-organization`); the row colors it instead.
  const leadingIconName = KIND_ICONS[row.kind];

  if (!playableItem) {
    return { isActive: options.isActive, isPlaying, leadingIconName };
  }

  const actionCopy = getSavedTrackPlaybackActionCopy({
    activePlayableItem: options.activePlayableItem,
    isPreparing: options.playback.isPreparing,
    playableItem,
    playbackState: options.playback.state,
  });

  return {
    isActive: options.isActive,
    isPlaying,
    leadingIconName,
    playbackRing: {
      accessibilityLabel: `${actionCopy.label} ${row.label}`,
      disabled: actionCopy.disabled,
      iconName: actionCopy.label === PAUSE_LABEL ? 'pause' : 'play',
      onPress: options.onToggle,
    },
  };
};

export const formatFilesRowMeta = (options: {
  isPlaying: boolean;
  supportingLabel: string;
}) => {
  return options.isPlaying
    ? `${PLAYING_META_LABEL}${ROW_META_SEPARATOR}${options.supportingLabel}`
    : options.supportingLabel;
};
